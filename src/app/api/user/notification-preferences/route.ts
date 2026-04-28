import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: return list of entity types the user has disabled
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: session.user.id },
      select: { entityType: true },
    });

    return NextResponse.json({ disabledTypes: prefs.map((p) => p.entityType) });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: disable notifications for an entity type (create a row)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { entityType } = await req.json() as { entityType: string };
    if (!entityType) return NextResponse.json({ error: "Missing entityType" }, { status: 400 });

    await prisma.notificationPreference.upsert({
      where: { userId_entityType: { userId: session.user.id, entityType } },
      update: {},
      create: { userId: session.user.id, entityType },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving notification preference:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: enable notifications for an entity type (remove the row)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { entityType } = await req.json() as { entityType: string };
    if (!entityType) return NextResponse.json({ error: "Missing entityType" }, { status: 400 });

    await prisma.notificationPreference.deleteMany({
      where: { userId: session.user.id, entityType },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting notification preference:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
