import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";

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

    const body = await req.json();
    const { startDate, name } = body as { startDate: string; name?: string };

    if (!startDate) {
      return NextResponse.json({ error: "Start date is required" }, { status: 400 });
    }

    // Fetch the template with all its content
    const template = await prisma.trip.findFirst({
      where: { id: tripId, isTemplate: true },
      include: {
        itinerary: true,
        transports: true,
        stages: true,
        packingLists: { include: { items: true } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Calculate date offset (ms)
    const newStart = new Date(startDate);
    newStart.setHours(0, 0, 0, 0);
    const origStart = template.startDate ? new Date(template.startDate) : null;
    origStart?.setHours(0, 0, 0, 0);
    const offsetMs = origStart ? newStart.getTime() - origStart.getTime() : 0;

    // Calculate new end date
    let newEndDate: Date | null = null;
    if (template.endDate && origStart) {
      newEndDate = new Date(template.endDate.getTime() + offsetMs);
    } else if (template.endDate && !origStart) {
      newEndDate = template.endDate;
    }

    function shiftDate(d: Date | null): Date | null {
      if (!d) return null;
      return new Date(d.getTime() + offsetMs);
    }

    // Create the new trip + all content in a transaction
    const newTrip = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          name: name || template.name,
          description: template.description,
          destination: template.destination,
          type: template.type,
          currency: template.currency,
          startDate: newStart,
          endDate: newEndDate,
          ownerId: session.user.id,
          members: {
            create: { userId: session.user.id, role: MemberRole.OWNER },
          },
        },
      });

      // Copy itinerary (with shifted times)
      if (template.itinerary.length > 0) {
        await tx.itineraryItem.createMany({
          data: template.itinerary.map((item) => ({
            tripId: trip.id,
            title: item.title,
            description: item.description,
            location: item.location,
            startTime: shiftDate(item.startTime)!,
            endTime: shiftDate(item.endTime),
            category: item.category,
            isAllDay: item.isAllDay,
            createdById: session.user.id,
          })),
        });
      }

      // Copy transport (with shifted times)
      if (template.transports.length > 0) {
        await tx.transport.createMany({
          data: template.transports.map((t) => ({
            tripId: trip.id,
            order: t.order,
            title: t.title,
            mode: t.mode,
            departureLocation: t.departureLocation,
            arrivalLocation: t.arrivalLocation,
            departureTime: shiftDate(t.departureTime)!,
            arrivalTime: shiftDate(t.arrivalTime)!,
            bookingReference: null, // don't copy booking refs
            notes: t.notes,
            cost: t.cost,
            createdById: session.user.id,
          })),
        });
      }

      // Copy stages (with shifted dates)
      if (template.stages.length > 0) {
        await tx.stage.createMany({
          data: template.stages.map((s) => ({
            tripId: trip.id,
            order: s.order,
            title: s.title,
            date: shiftDate(s.date),
            description: s.description,
            startLocation: s.startLocation,
            endLocation: s.endLocation,
            distance: s.distance,
            elevationGain: s.elevationGain,
            elevationLoss: s.elevationLoss,
            duration: s.duration,
            difficulty: s.difficulty,
            accommodation: s.accommodation,
            createdById: session.user.id,
          })),
        });
      }

      // Copy packing lists (items reset to unpacked)
      for (const list of template.packingLists) {
        if (list.isPrivate) continue; // skip private lists
        const newList = await tx.packingList.create({
          data: {
            tripId: trip.id,
            name: list.name,
            isPrivate: false,
            createdById: session.user.id,
          },
        });
        if (list.items.length > 0) {
          await tx.packingItem.createMany({
            data: list.items.map((item) => ({
              packingListId: newList.id,
              name: item.name,
              quantity: item.quantity,
              category: item.category,
              categoryEmoji: item.categoryEmoji,
              isPacked: false,
            })),
          });
        }
      }

      // Increment template use count
      await tx.trip.update({
        where: { id: tripId },
        data: { templateUseCount: { increment: 1 } },
      });

      return trip;
    });

    return NextResponse.json({ trip: newTrip }, { status: 201 });
  } catch (error) {
    console.error("Use template error:", error);
    return NextResponse.json({ error: "Failed to create trip from template" }, { status: 500 });
  }
}
