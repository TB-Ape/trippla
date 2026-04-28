import { prisma } from "@/lib/prisma";

export async function getTripPackingLists(tripId: string, userId: string) {
  return await prisma.packingList.findMany({
    where: {
      tripId: tripId,
      OR: [
        { isPrivate: false },
        { isPrivate: true, createdById: userId },
      ],
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          claimedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createPackingList(data: {
  tripId: string;
  name: string;
  isPrivate?: boolean;
  createdById: string;
  tripCategory?: string;
}) {
  return await prisma.packingList.create({
    data: data,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: true,
    },
  });
}

export async function deletePackingList(id: string) {
  return await prisma.packingList.delete({
    where: { id },
  });
}

export async function createPackingItem(data: {
  packingListId: string;
  name: string;
  quantity: number;
  category?: string;
  categoryEmoji?: string;
}) {
  return await prisma.packingItem.create({
    data: {
      ...data,
      category: data.category || "other",
    },
    include: {
      claimedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function updatePackingItem(
  id: string,
  data: {
    name?: string;
    quantity?: number;
    category?: string;
    isPacked?: boolean;
    claimedById?: string | null;
  }
) {
  return await prisma.packingItem.update({
    where: { id },
    data: data,
    include: {
      claimedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function deletePackingItem(id: string) {
  return await prisma.packingItem.delete({
    where: { id },
  });
}
