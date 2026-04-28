import { prisma } from "@/lib/prisma";

export async function getTripPolls(tripId: string) {
  return await prisma.poll.findMany({
    where: {
      tripId: tripId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      options: {
        include: {
          votes: {
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

export async function createPoll(data: {
  tripId: string;
  question: string;
  options: { text: string }[];
  allowMultiple: boolean;
  expiresAt?: Date;
  createdById: string;
}) {
  return await prisma.poll.create({
    data: {
      tripId: data.tripId,
      question: data.question,
      allowMultiple: data.allowMultiple,
      expiresAt: data.expiresAt,
      createdById: data.createdById,
      options: {
        create: data.options.map((option) => ({
          text: option.text,
        })),
      },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      options: {
        include: {
          votes: {
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
        },
      },
    },
  });
}

export async function deletePoll(id: string) {
  return await prisma.poll.delete({
    where: { id },
  });
}

export async function createVote(data: { optionId: string; userId: string }) {
  // Check if user already voted for this poll
  const option = await prisma.pollOption.findUnique({
    where: { id: data.optionId },
    include: {
      poll: true,
    },
  });

  if (!option) {
    throw new Error("Poll option not found");
  }

  // Check if poll allows multiple votes
  if (!option.poll.allowMultiple) {
    // Delete any existing votes from this user for this poll
    await prisma.pollVote.deleteMany({
      where: {
        userId: data.userId,
        option: {
          pollId: option.pollId,
        },
      },
    });
  }

  return await prisma.pollVote.create({
    data: {
      pollId: option.pollId,
      optionId: data.optionId,
      userId: data.userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function deleteVote(optionId: string, userId: string) {
  return await prisma.pollVote.deleteMany({
    where: {
      optionId: optionId,
      userId: userId,
    },
  });
}
