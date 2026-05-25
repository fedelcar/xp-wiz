import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, session.user.id));

  return NextResponse.json(settings ?? { cutoffMonth: 1, cutoffDay: 1, activeYear: new Date().getFullYear() });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cutoffMonth, cutoffDay, activeYear } = await req.json();

  const [updated] = await db
    .insert(userSettings)
    .values({ userId: session.user.id, cutoffMonth, cutoffDay, activeYear })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { cutoffMonth, cutoffDay, activeYear },
    })
    .returning();

  return NextResponse.json(updated);
}
