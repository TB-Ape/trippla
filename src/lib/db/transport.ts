import { prisma } from "@/lib/prisma";

export async function getTripTransports(tripId: string) {
  return await prisma.transport.findMany({
    where: { tripId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { departureTime: "asc" },
  });
}

export async function createTransport(data: {
  tripId: string;
  title: string;
  mode: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string;
  arrivalTime: string;
  bookingReference?: string;
  notes?: string;
  cost?: number;
  createdById: string;
}) {
  const maxOrder = await prisma.transport.aggregate({
    where: { tripId: data.tripId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  return await prisma.transport.create({
    data: {
      ...data,
      departureTime: new Date(data.departureTime),
      arrivalTime: new Date(data.arrivalTime),
      order: nextOrder,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function updateTransport(
  id: string,
  data: {
    title?: string;
    mode?: string;
    departureLocation?: string;
    arrivalLocation?: string;
    departureTime?: string;
    arrivalTime?: string;
    bookingReference?: string;
    notes?: string;
    cost?: number | null;
    order?: number;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.departureTime) updateData.departureTime = new Date(data.departureTime);
  if (data.arrivalTime) updateData.arrivalTime = new Date(data.arrivalTime);

  return await prisma.transport.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function deleteTransport(id: string) {
  const deleted = await prisma.transport.delete({
    where: { id },
  });

  // Reorder remaining transports
  const remaining = await prisma.transport.findMany({
    where: { tripId: deleted.tripId },
    orderBy: { order: "asc" },
  });

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].order !== i + 1) {
      await prisma.transport.update({
        where: { id: remaining[i].id },
        data: { order: i + 1 },
      });
    }
  }

  return deleted;
}
