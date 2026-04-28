import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById, getMemberRole } from "@/lib/db/trips";
import {
  getTripItinerary,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
} from "@/lib/db/itinerary";
import { createItineraryItemSchema } from "@/lib/validations/itinerary";
import { createActivity } from "@/lib/db/activities";
import { sendTripNotifications } from "@/lib/notifications";
import { Decimal } from "@prisma/client/runtime/library";
import { canModifyItem } from "@/lib/permissions";
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

    // Verify user has access to this trip
    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const [items, userRole] = await Promise.all([
      getTripItinerary(tripId),
      getMemberRole(tripId, session.user.id),
    ]);

    return NextResponse.json({ items, userRole, tripStartDate: trip.startDate }, { status: 200 });
  } catch (error) {
    console.error("Get itinerary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch itinerary" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this trip
    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = createItineraryItemSchema.parse(body);

    const item = await createItineraryItem({
      tripId: tripId,
      title: validatedData.title,
      description: validatedData.description,
      location: validatedData.location,
      startTime: new Date(validatedData.startTime),
      endTime: validatedData.endTime
        ? new Date(validatedData.endTime)
        : undefined,
      category: validatedData.category,
      isAllDay: validatedData.isAllDay,
      cost: validatedData.cost,
      createdById: session.user.id,
    });

    // Auto-create linked expense when cost is set
    if (validatedData.cost && validatedData.cost > 0) {
      const memberIds = validatedData.splitMemberIds ?? [];
      const amount = new Decimal(validatedData.cost);
      const splits = memberIds.length > 0
        ? memberIds.map((userId) => ({ userId, amount: amount.dividedBy(memberIds.length) }))
        : [];
      const expenseCategory = validatedData.category === "meal" ? "food" : (validatedData.category ?? "other");
      prisma.expense.create({
        data: {
          tripId,
          description: validatedData.title,
          amount,
          currency: trip.currency,
          category: expenseCategory,
          paidById: session.user.id,
          date: new Date(validatedData.startTime),
          itineraryItemId: item.id,
          splits: splits.length > 0 ? { create: splits } : undefined,
        },
      }).catch(() => {});
    }

    createActivity({
      tripId,
      userId: session.user.id,
      action: "created",
      entityType: "itinerary",
      entityId: item.id,
      entityName: item.title,
    }).catch(() => {});
    sendTripNotifications(tripId, session.user.id, "itinerary", item.title, "created");

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create itinerary item error:", error);
    // Return the actual error message for debugging
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create itinerary item" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, splitMemberIds, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    const existing = await prisma.itineraryItem.findUnique({
      where: { id },
      select: { tripId: true, createdById: true, category: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert date strings to Date objects
    if (updateData.startTime) {
      updateData.startTime = new Date(updateData.startTime);
    }
    if (updateData.endTime) {
      updateData.endTime = new Date(updateData.endTime);
    }

    const item = await updateItineraryItem(id, updateData);

    // Sync linked expense if cost changed
    if ("cost" in updateData) {
      const linkedExpense = await prisma.expense.findUnique({
        where: { itineraryItemId: id },
        select: { id: true },
      });
      if (updateData.cost != null && updateData.cost > 0) {
        const amount = new Decimal(updateData.cost);
        const memberIds: string[] = splitMemberIds ?? [];
        const splits = memberIds.map((userId) => ({ userId, amount: amount.dividedBy(memberIds.length) }));
        if (linkedExpense) {
          // Update amount/description/date and replace splits
          prisma.expense.update({
            where: { id: linkedExpense.id },
            data: {
              amount,
              ...(updateData.title && { description: updateData.title }),
              ...(updateData.startTime && { date: updateData.startTime }),
              splits: {
                deleteMany: {},
                ...(splits.length > 0 && { create: splits }),
              },
            },
          }).catch(() => {});
        } else {
          const trip = await prisma.trip.findUnique({ where: { id: existing.tripId }, select: { currency: true } });
          const cat = updateData.category ?? existing.category;
          const expCat = cat === "meal" ? "food" : (cat ?? "other");
          prisma.expense.create({
            data: {
              tripId: existing.tripId,
              description: updateData.title ?? item.title,
              amount,
              currency: trip?.currency ?? "EUR",
              category: expCat,
              paidById: session.user.id,
              date: updateData.startTime ?? item.startTime,
              itineraryItemId: id,
              splits: splits.length > 0 ? { create: splits } : undefined,
            },
          }).catch(() => {});
        }
      } else if (updateData.cost === null && linkedExpense) {
        prisma.expense.delete({ where: { id: linkedExpense.id } }).catch(() => {});
      }
    }

    createActivity({
      tripId: item.tripId,
      userId: session.user.id,
      action: "updated",
      entityType: "itinerary",
      entityId: item.id,
      entityName: item.title,
    }).catch(() => {});

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error("Update itinerary item error:", error);
    return NextResponse.json(
      { error: "Failed to update itinerary item" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    const existing = await prisma.itineraryItem.findUnique({ where: { id }, select: { tripId: true, createdById: true } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteItineraryItem(id);

    createActivity({
      tripId: deleted.tripId,
      userId: session.user.id,
      action: "deleted",
      entityType: "itinerary",
      entityId: deleted.id,
      entityName: deleted.title,
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete itinerary item error:", error);
    return NextResponse.json(
      { error: "Failed to delete itinerary item" },
      { status: 500 }
    );
  }
}
