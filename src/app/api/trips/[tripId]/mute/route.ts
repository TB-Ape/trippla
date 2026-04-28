import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: mute this trip
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;

  // Verify membership
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Not a trip member" }, { status: 403 });

  await prisma.tripNotificationMute.upsert({
    where: { userId_tripId: { userId: session.user.id, tripId } },
    update: {},
    create: { userId: session.user.id, tripId },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: unmute this trip
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Not a trip member" }, { status: 403 });

  await prisma.tripNotificationMute.deleteMany({
    where: { userId: session.user.id, tripId },
  });

  return NextResponse.json({ ok: true });
}
