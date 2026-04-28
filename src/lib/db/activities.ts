import { prisma } from "@/lib/prisma";

export async function createActivity(data: {
  tripId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
}) {
  return prisma.activity.create({
    data: {
      tripId: data.tripId,
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
    },
  });
}

export async function getTripActivities(tripId: string, limit = 20, cursor?: string) {
  return prisma.activity.findMany({
    where: { tripId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor },
        }
      : {}),
  });
}
