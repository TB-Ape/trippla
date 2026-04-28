import { prisma } from "@/lib/prisma";

export async function getTripStages(tripId: string) {
  return await prisma.stage.findMany({
    where: { tripId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { order: "asc" },
  });
}

export async function createStage(data: {
  tripId: string;
  title: string;
  date?: Date;
  description?: string;
  startLocation?: string;
  endLocation?: string;
  distance?: number;
  elevationGain?: number;
  elevationLoss?: number;
  duration?: number;
  difficulty?: string;
  accommodation?: string;
  gpxPath?: string;
  createdById: string;
}) {
  // Auto-set order to next available
  const maxOrder = await prisma.stage.aggregate({
    where: { tripId: data.tripId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  return await prisma.stage.create({
    data: {
      ...data,
      order: nextOrder,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function updateStage(
  id: string,
  data: {
    title?: string;
    date?: Date | null;
    description?: string;
    startLocation?: string;
    endLocation?: string;
    distance?: number;
    elevationGain?: number;
    elevationLoss?: number;
    duration?: number;
    difficulty?: string;
    accommodation?: string;
    order?: number;
  }
) {
  return await prisma.stage.update({
    where: { id },
    data,
  });
}

export async function deleteStage(id: string) {
  const deleted = await prisma.stage.delete({
    where: { id },
  });

  // Reorder remaining stages
  const remaining = await prisma.stage.findMany({
    where: { tripId: deleted.tripId },
    orderBy: { order: "asc" },
  });

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].order !== i + 1) {
      await prisma.stage.update({
        where: { id: remaining[i].id },
        data: { order: i + 1 },
      });
    }
  }

  return deleted;
}
