import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { xpEntries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Only update fields explicitly present in the request body
  const set: Record<string, unknown> = {};
  if ("date" in body) set.date = body.date;
  if ("destination" in body) set.destination = body.destination;
  if ("isReturn" in body) set.isReturn = body.isReturn;
  if ("status" in body) set.status = body.status;
  if ("entryType" in body) set.entryType = body.entryType;
  if ("cabinClass" in body) set.cabinClass = body.cabinClass;
  if ("returnCabinClass" in body) set.returnCabinClass = body.returnCabinClass ?? null;
  if ("xp" in body) set.xp = body.xp;
  if ("hasSaf" in body) set.hasSaf = body.hasSaf;
  if ("safXp" in body) set.safXp = body.safXp;
  if ("safCostEur" in body) set.safCostEur = body.safCostEur?.toString();
  if ("entryName" in body) set.entryName = body.entryName;
  if ("isRecurring" in body) set.isRecurring = body.isRecurring;

  const [entry] = await db
    .update(xpEntries)
    .set(set)
    .where(and(eq(xpEntries.id, parseInt(id)), eq(xpEntries.userId, session.user.id)))
    .returning();

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  console.log(`DELETE /api/entries/${id} userId=${session.user.id}`);

  const deleted = await db
    .delete(xpEntries)
    .where(and(eq(xpEntries.id, parseInt(id)), eq(xpEntries.userId, session.user.id)))
    .returning();

  console.log(`Deleted ${deleted.length} row(s) for id=${id}`);
  return NextResponse.json({ ok: true, deleted: deleted.length });
}
