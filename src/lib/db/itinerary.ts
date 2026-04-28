import { prisma } from "@/lib/prisma";

export async function getTripItinerary(tripId: string) {
  return await prisma.itineraryItem.findMany({
    where: {
      tripId: tripId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });
}

export async function createItineraryItem(data: {
  tripId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  category?: string;
  isAllDay?: boolean;
  cost?: number;
  createdById: string;
}) {
  return await prisma.itineraryItem.create({
    data: {
      ...data,
      category: data.category || "other",
      isAllDay: data.isAllDay || false,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function updateItineraryItem(
  id: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    startTime?: Date;
    endTime?: Date;
    category?: string;
    isAllDay?: boolean;
    cost?: number | null;
  }
) {
  return await prisma.itineraryItem.update({
    where: { id },
    data,
  });
}

export async function deleteItineraryItem(id: string) {
  return await prisma.itineraryItem.delete({
    where: { id },
  });
}
