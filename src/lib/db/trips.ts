import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";

export async function getUserTrips(userId: string) {
  return await prisma.trip.findMany({
    where: {
      isBucketList: false,
      isTemplate: false,
      isTemplateStore: false,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          itinerary: true,
          expenses: true,
        },
      },
      activities: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        where: { userId: { not: userId } },
        select: { createdAt: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getUserBucketList(userId: string) {
  return await prisma.trip.findMany({
    where: {
      isBucketList: true,
      ownerId: userId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      _count: {
        select: {
          members: true,
          itinerary: true,
          expenses: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createBucketListItem(data: {
  name: string;
  description?: string;
  destination?: string;
  type?: string;
  ownerId: string;
}) {
  return await prisma.trip.create({
    data: {
      ...data,
      isBucketList: true,
      members: {
        create: {
          userId: data.ownerId,
          role: MemberRole.OWNER,
        },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

export async function createTrip(data: {
  name: string;
  description?: string;
  destination?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  ownerId: string;
}) {
  return await prisma.trip.create({
    data: {
      ...data,
      members: {
        create: {
          userId: data.ownerId,
          role: MemberRole.OWNER,
        },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });
}

export async function getTripById(tripId: string, userId: string) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return trip;
}

export async function getMemberRole(tripId: string, userId: string): Promise<MemberRole | null> {
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

export async function updateMemberRole(tripId: string, memberId: string, role: MemberRole) {
  return await prisma.tripMember.update({
    where: { id: memberId, tripId },
    data: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function joinTripByCode(joinCode: string, userId: string) {
  const trip = await prisma.trip.findUnique({
    where: { joinCode },
    include: {
      members: {
        where: {
          userId: userId,
        },
      },
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  if (trip.members.length > 0) {
    throw new Error("You are already a member of this trip");
  }

  return await prisma.tripMember.create({
    data: {
      tripId: trip.id,
      userId: userId,
      role: MemberRole.MEMBER,
    },
    include: {
      trip: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}
