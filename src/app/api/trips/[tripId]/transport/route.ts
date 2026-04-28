import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById, getMemberRole } from "@/lib/db/trips";
import {
  getTripTransports,
  createTransport,
  updateTransport,
  deleteTransport,
} from "@/lib/db/transport";
import { createTransportSchema } from "@/lib/validations/transport";
import { createActivity } from "@/lib/db/activities";
import { sendTripNotifications } from "@/lib/notifications";
import { canModifyItem } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
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

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const [transports, userRole] = await Promise.all([
      getTripTransports(tripId),
      getMemberRole(tripId, session.user.id),
    ]);

    return NextResponse.json({ transports, userRole, tripStartDate: trip.startDate }, { status: 200 });
  } catch (error) {
    console.error("Get transports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transports" },
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

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = createTransportSchema.parse(body);

    const transport = await createTransport({
      tripId,
      title: validatedData.title,
      mode: validatedData.mode,
      departureLocation: validatedData.departureLocation,
      arrivalLocation: validatedData.arrivalLocation,
      departureTime: validatedData.departureTime,
      arrivalTime: validatedData.arrivalTime,
      bookingReference: validatedData.bookingReference,
      notes: validatedData.notes,
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
      prisma.expense.create({
        data: {
          tripId,
          description: transport.title,
          amount,
          currency: trip.currency,
          category: "transport",
          paidById: session.user.id,
          date: new Date(validatedData.departureTime),
          transportId: transport.id,
          splits: splits.length > 0 ? { create: splits } : undefined,
        },
      }).catch(() => {});
    }

    createActivity({
      tripId,
      userId: session.user.id,
      action: "created",
      entityType: "transport",
      entityId: transport.id,
      entityName: transport.title,
    }).catch(() => {});
    sendTripNotifications(tripId, session.user.id, "transport", transport.title, "created");

    return NextResponse.json({ transport }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create transport error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create transport" },
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
    const { id, splitMemberIds: _splitMemberIds, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Transport ID required" }, { status: 400 });
    }

    const existing = await prisma.transport.findUnique({ where: { id }, select: { tripId: true, createdById: true, title: true, departureTime: true } });
    if (!existing) {
      return NextResponse.json({ error: "Transport not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const transport = await updateTransport(id, updateData);

    // Sync linked expense if cost changed
    if ("cost" in updateData) {
      const linkedExpense = await prisma.expense.findUnique({
        where: { transportId: id },
        select: { id: true },
      });
      if (updateData.cost != null && updateData.cost > 0) {
        const amount = new Decimal(updateData.cost);
        const memberIds: string[] = body.splitMemberIds ?? [];
        const splits = memberIds.map((userId: string) => ({ userId, amount: amount.dividedBy(memberIds.length) }));
        if (linkedExpense) {
          prisma.expense.update({
            where: { id: linkedExpense.id },
            data: {
              amount,
              ...(updateData.title && { description: updateData.title }),
              ...(updateData.departureTime && { date: new Date(updateData.departureTime) }),
              splits: {
                deleteMany: {},
                ...(splits.length > 0 && { create: splits }),
              },
            },
          }).catch(() => {});
        } else {
          const trip = await prisma.trip.findUnique({ where: { id: existing.tripId }, select: { currency: true } });
          prisma.expense.create({
            data: {
              tripId: existing.tripId,
              description: updateData.title ?? existing.title,
              amount,
              currency: trip?.currency ?? "EUR",
              category: "transport",
              paidById: session.user.id,
              date: updateData.departureTime ? new Date(updateData.departureTime) : existing.departureTime,
              transportId: id,
              splits: splits.length > 0 ? { create: splits } : undefined,
            },
          }).catch(() => {});
        }
      } else if (updateData.cost === null && linkedExpense) {
        prisma.expense.delete({ where: { id: linkedExpense.id } }).catch(() => {});
      }
    }

    createActivity({
      tripId: transport.tripId,
      userId: session.user.id,
      action: "updated",
      entityType: "transport",
      entityId: transport.id,
      entityName: transport.title,
    }).catch(() => {});

    return NextResponse.json({ transport }, { status: 200 });
  } catch (error) {
    console.error("Update transport error:", error);
    return NextResponse.json(
      { error: "Failed to update transport" },
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
      return NextResponse.json({ error: "Transport ID required" }, { status: 400 });
    }

    const existing = await prisma.transport.findUnique({ where: { id }, select: { tripId: true, createdById: true } });
    if (!existing) {
      return NextResponse.json({ error: "Transport not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteTransport(id);

    createActivity({
      tripId: deleted.tripId,
      userId: session.user.id,
      action: "deleted",
      entityType: "transport",
      entityId: deleted.id,
      entityName: deleted.title,
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete transport error:", error);
    return NextResponse.json(
      { error: "Failed to delete transport" },
      { status: 500 }
    );
  }
}
