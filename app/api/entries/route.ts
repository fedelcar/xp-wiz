import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { xpEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await db
    .select()
    .from(xpEntries)
    .where(eq(xpEntries.userId, session.user.id))
    .orderBy(xpEntries.date);

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { date, origin, destination, isReturn, status, entryType, cabinClass, returnCabinClass, xp, hasSaf, safXp, safCostEur, entryName, isRecurring } = body;

  const [entry] = await db
    .insert(xpEntries)
    .values({
      userId: session.user.id,
      date,
      origin: origin ?? null,
      destination,
      isReturn: isReturn ?? false,
      status,
      entryType: entryType ?? "flight",
      cabinClass,
      returnCabinClass: returnCabinClass ?? null,
      xp,
      hasSaf: hasSaf ?? false,
      safXp: safXp ?? 0,
      safCostEur: safCostEur?.toString(),
      entryName,
      isRecurring: isRecurring ?? false,
    })
    .returning();

  return NextResponse.json(entry);
}
