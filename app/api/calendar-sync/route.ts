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
}

function parseIcs(icsText: string): CalendarFlight[] {
  const flights: CalendarFlight[] = [];

  // Split on VEVENT boundaries
  const blocks = icsText.split(/BEGIN:VEVENT/);
  for (const block of blocks.slice(1)) {
    // Unfold continuation lines (RFC 5545: lines folded with CRLF + space/tab)
    const unfolded = block.replace(/\r?\n[ \t]/g, "");

    // Extract SUMMARY
    const summaryMatch = unfolded.match(/^SUMMARY:(.+)$/m);
    if (!summaryMatch) continue;
    const summary = summaryMatch[1].trim();

    // Match "ORIGIN→DEST • AIRLINE FLIGHTNUM" (plane emoji prefix optional)
    const flightMatch = summary.match(/([A-Z]{3})[→>]([A-Z]{3})\s*[•·]\s*([A-Z]{2,3})\s+(\d+)/);
    if (!flightMatch) continue;
    const [, origin, destination, airline, flightNum] = flightMatch;

    // Extract start date — handles DTSTART;TZID=...:YYYYMMDDTHHMMSS and DTSTART:YYYYMMDDTHHMMSSZ
    const dtMatch = unfolded.match(/^DTSTART(?:;[^:]+)?:(\d{8})/m);
    if (!dtMatch) continue;
    const raw = dtMatch[1];
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

    const suggestedXp = suggestXp(destination, "economy", false);

    flights.push({ date, origin, destination, airline, flightNum, suggestedXp });
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

  // Restrict to next 12 months
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() + 12);

  const upcoming = allFlights.filter((f) => {
    const d = new Date(f.date);
    return d >= now && d <= cutoff;
  });

  // Load existing entries for deduplication
  const existing = await db
    .select({ destination: xpEntries.destination, date: xpEntries.date })
    .from(xpEntries)
    .where(eq(xpEntries.userId, session.user.id));

  // Deduplicate: same destination + same YYYY-MM
  const newFlights = upcoming.filter((f) => {
    const fMonth = f.date.slice(0, 7);
    return !existing.some(
      (e) =>
        e.destination.toUpperCase() === f.destination.toUpperCase() &&
        e.date.slice(0, 7) === fMonth
    );
  });

  return NextResponse.json(newFlights);
}
