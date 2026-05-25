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

  const [entry] = await db
    .update(xpEntries)
    .set({
      date: body.date,
      destination: body.destination,
      isReturn: body.isReturn,
      status: body.status,
      entryType: body.entryType,
      cabinClass: body.cabinClass,
      xp: body.xp,
      hasSaf: body.hasSaf,
      safXp: body.safXp,
      safCostEur: body.safCostEur?.toString(),
      entryName: body.entryName,
      isRecurring: body.isRecurring,
    })
    .where(and(eq(xpEntries.id, parseInt(id)), eq(xpEntries.userId, session.user.id)))
    .returning();

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(xpEntries)
    .where(and(eq(xpEntries.id, parseInt(id)), eq(xpEntries.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
