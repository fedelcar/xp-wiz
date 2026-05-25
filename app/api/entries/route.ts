import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { xpEntries, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SEED_ENTRIES } from "@/lib/xp-utils";

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

  // Seed action: insert default entries if user has none
  if (body.action === "seed") {
    const existing = await db
      .select()
      .from(xpEntries)
      .where(eq(xpEntries.userId, session.user.id));

    if (existing.length === 0) {
      await db.insert(xpEntries).values(
        SEED_ENTRIES.map(({ id: _id, ...e }) => ({
          ...e,
          userId: session.user!.id!,
          isReturn: e.isReturn,
          status: e.status as "completed" | "scheduled" | "planned",
          entryType: e.entryType as "flight" | "card" | "bonus",
        }))
      );

      // Ensure settings row exists
      await db
        .insert(userSettings)
        .values({ userId: session.user!.id!, cutoffMonth: 1, cutoffDay: 1, activeYear: 2026 })
        .onConflictDoNothing();
    }

    return NextResponse.json({ ok: true });
  }

  const { date, destination, isReturn, status, entryType, cabinClass, xp, hasSaf, safXp, safCostEur, entryName, isRecurring } = body;

  const [entry] = await db
    .insert(xpEntries)
    .values({
      userId: session.user.id,
      date,
      destination,
      isReturn: isReturn ?? false,
      status,
      entryType: entryType ?? "flight",
      cabinClass,
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
