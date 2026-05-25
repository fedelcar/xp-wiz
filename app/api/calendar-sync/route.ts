import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userSettings, xpEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { suggestXp } from "@/lib/xp-utils";

export interface CalendarFlight {
  date: string;       // "YYYY-MM-DD"
  origin: string;
  destination: string;
  airline: string;
  flightNum: string;
  suggestedXp: number | null;
  exists: boolean;    // true if already in the tracker (same dest + month)
}

type ParsedFlight = Omit<CalendarFlight, "exists">;

function parseIcs(icsText: string): ParsedFlight[] {
  const flights: ParsedFlight[] = [];

  const blocks = icsText.split(/BEGIN:VEVENT/);
  for (const block of blocks.slice(1)) {
    // Unfold continuation lines (RFC 5545: CRLF + space/tab)
    const unfolded = block.replace(/\r?\n[ \t]/g, "");

    const summaryMatch = unfolded.match(/^SUMMARY:(.+)$/m);
    if (!summaryMatch) continue;

    // Flighty embeds invisible Unicode (U+200B zero-width spaces, U+00A0 non-breaking spaces, etc.)
    // around the arrow and between airline code and flight number.
    // Strip everything non-ASCII except the two special chars we need: → (→) and • (bullet)
    const raw = summaryMatch[1].trim();
    const cleaned = raw
      .replace(/[^\x00-\x7E→•]/g, " ") // keep ASCII + → + •
      .replace(/\s+/g, " ")
      .trim();

    // "ORIGIN→DEST • AIRLINE FLIGHTNUM"
    const flightMatch = cleaned.match(/([A-Z]{3}) ?→ ?([A-Z]{3}) ?• ?([A-Z]{2,3}) +(\d+)/);
    if (!flightMatch) continue;
    const [, origin, destination, airline, flightNum] = flightMatch;

    // DTSTART handles ;TZID=...: prefix and bare Z/no-suffix formats
    const dtMatch = unfolded.match(/^DTSTART(?:;[^:]+)?:(\d{8})/m);
    if (!dtMatch) continue;
    const d = dtMatch[1];
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

    // XP is zone-based (distance from Paris). For flights back to CDG/ORY,
    // look up the non-Paris airport instead.
    const PARIS = new Set(["CDG", "ORY"]);
    const xpAirport = PARIS.has(destination) ? origin : destination;
    flights.push({
      date, origin, destination, airline, flightNum,
      suggestedXp: suggestXp(xpAirport, "economy", false),
    });
  }

  return flights;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, session.user.id));

  const icsUrl = settings?.calendarIcsUrl;
  if (!icsUrl) return NextResponse.json({ error: "No calendar URL configured" }, { status: 400 });

  let icsText: string;
  try {
    const res = await fetch(icsUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch {
    return NextResponse.json({ error: "Failed to fetch calendar — check the URL in Settings" }, { status: 502 });
  }

  const allFlights = parseIcs(icsText);

  // Next 12 months from today
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() + 12);

  const upcoming = allFlights.filter((f) => {
    // Use noon to avoid UTC/local day-boundary issues on date-only strings
    const d = new Date(f.date + "T12:00:00");
    return d >= now && d <= cutoff;
  });

  const existing = await db
    .select({ destination: xpEntries.destination, date: xpEntries.date })
    .from(xpEntries)
    .where(eq(xpEntries.userId, session.user.id));

  const flights: CalendarFlight[] = upcoming.map((f) => {
    const fMonth = f.date.slice(0, 7);
    const exists = existing.some(
      (e) =>
        e.destination.toUpperCase() === f.destination.toUpperCase() &&
        e.date.slice(0, 7) === fMonth
    );
    return { ...f, exists };
  });

  return NextResponse.json(flights);
}
