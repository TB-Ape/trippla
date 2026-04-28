import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberRole } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ tripId: string; itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { tripId, itemId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getMemberRole(tripId, session.user.id);
    if (!role) {
      return NextResponse.json({ error: "Not a trip member" }, { status: 403 });
    }

    const item = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      select: { tripId: true },
    });
    if (!item || item.tripId !== tripId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.itineraryParticipant.upsert({
      where: { itineraryItemId_userId: { itineraryItemId: itemId, userId: session.user.id } },
      create: { itineraryItemId: itemId, userId: session.user.id },
      update: {},
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Join itinerary item error:", error);
    return NextResponse.json({ error: "Failed to join activity" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { tripId, itemId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getMemberRole(tripId, session.user.id);
    if (!role) {
      return NextResponse.json({ error: "Not a trip member" }, { status: 403 });
    }

    await prisma.itineraryParticipant.deleteMany({
      where: { itineraryItemId: itemId, userId: session.user.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Leave itinerary item error:", error);
    return NextResponse.json({ error: "Failed to leave activity" }, { status: 500 });
  }
}
