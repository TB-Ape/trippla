import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [trip, mute] = await Promise.all([
      getTripById(tripId, session.user.id),
      prisma.tripNotificationMute.findUnique({
        where: { userId_tripId: { userId: session.user.id, tripId } },
      }),
    ]);

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({ trip, isMuted: !!mute }, { status: 200 });
  } catch (error) {
    console.error("Get trip error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

const updateTripSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  type: z.enum(["city", "beach", "camping", "hiking", "cycling", "roadtrip", "ski", "cruise"]).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  isTemplate: z.boolean().optional(),
  templateDescription: z.string().optional().nullable(),
  isBucketList: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only the owner can edit
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, ownerId: session.user.id },
    });

    if (!trip) {
      return NextResponse.json({ error: "Not authorized to edit this trip" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateTripSchema.parse(body);

    // Validate end date >= start date
    const effectiveStart = data.startDate !== undefined ? data.startDate : (trip.startDate ? trip.startDate.toISOString().split("T")[0] : null);
    const effectiveEnd = data.endDate !== undefined ? data.endDate : (trip.endDate ? trip.endDate.toISOString().split("T")[0] : null);
    if (effectiveStart && effectiveEnd && new Date(effectiveEnd) < new Date(effectiveStart)) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.destination !== undefined && { destination: data.destination || null }),
        ...(data.type !== undefined && { type: data.type || null }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.isTemplate !== undefined && { isTemplate: data.isTemplate }),
        ...(data.templateDescription !== undefined && { templateDescription: data.templateDescription || null }),
        ...(data.isBucketList !== undefined && { isBucketList: data.isBucketList }),
      },
    });

    return NextResponse.json({ trip: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update trip error:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only the owner can delete
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, ownerId: session.user.id },
    });

    if (!trip) {
      return NextResponse.json({ error: "Not authorized to delete this trip" }, { status: 403 });
    }

    await prisma.trip.delete({ where: { id: tripId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
