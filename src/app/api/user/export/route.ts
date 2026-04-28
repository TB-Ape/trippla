import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  try {
    const [
      user,
      trips,
      itineraryItems,
      expenses,
      expenseSplits,
      packingItems,
      pollVotes,
      comments,
      notificationPreferences,
      pushSubscriptions,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          termsAcceptedAt: true,
          termsVersion: true,
        },
      }),
      prisma.trip.findMany({
        where: {
          isTemplateStore: false,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        select: {
          id: true,
          name: true,
          destination: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          isTemplate: true,
          isBucketList: true,
        },
      }),
      prisma.itineraryItem.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          tripId: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          location: true,
          category: true,
          createdAt: true,
        },
      }),
      prisma.expense.findMany({
        where: { paidById: userId },
        select: {
          id: true,
          tripId: true,
          description: true,
          amount: true,
          currency: true,
          date: true,
          category: true,
        },
      }),
      prisma.expenseSplit.findMany({
        where: { userId },
        select: { expenseId: true, amount: true, isPaid: true },
      }),
      prisma.packingItem.findMany({
        where: { claimedById: userId },
        select: { id: true, packingListId: true, name: true, quantity: true, category: true },
      }),
      prisma.pollVote.findMany({
        where: { userId },
        select: { pollId: true, optionId: true },
      }),
      prisma.comment.findMany({
        where: { userId },
        select: { id: true, content: true, itineraryItemId: true, createdAt: true },
      }),
      prisma.notificationPreference.findMany({
        where: { userId },
        select: { entityType: true },
      }),
      prisma.pushSubscription.findMany({
        where: { userId },
        select: { endpoint: true, p256dh: true, auth: true, createdAt: true },
      }),
    ]);

    const exportData = {
      exportedAt: now.toISOString(),
      profile: user,
      trips,
      itineraryItemsCreated: itineraryItems,
      expensesPaid: expenses,
      expenseSplits,
      packingItemsClaimed: packingItems,
      pollVotes,
      comments,
      notificationPreferences,
      pushSubscriptions,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="trippla-data-export-${now.toISOString().split("T")[0]}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
