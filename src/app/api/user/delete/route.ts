import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const deleteSchema = z.object({
  email: z.string().email(),
});

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email } = deleteSchema.parse(body);

    if (email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match your account" }, { status: 400 });
    }

    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      // Get IDs of trips this user owns (these cascade-delete via Trip relation)
      const ownedTripIds = await tx.trip
        .findMany({ where: { ownerId: userId }, select: { id: true } })
        .then((trips) => trips.map((t) => t.id));

      // Expense.paidBy has no onDelete — must delete manually for non-owned trips
      const externalExpenses = await tx.expense.findMany({
        where: { paidById: userId, tripId: { notIn: ownedTripIds } },
        select: { id: true },
      });

      if (externalExpenses.length > 0) {
        const ids = externalExpenses.map((e) => e.id);
        await tx.expenseSplit.deleteMany({ where: { expenseId: { in: ids } } });
        await tx.expense.deleteMany({ where: { id: { in: ids } } });
      }

      // PackingItem.claimedBy has no onDelete — must null out claimedById for non-owned trips
      await tx.packingItem.updateMany({
        where: {
          claimedById: userId,
          packingList: { tripId: { notIn: ownedTripIds } },
        },
        data: { claimedById: null },
      });

      // Delete user — cascades handle: ownedTrips, tripMembers, itineraryItems,
      // packingLists, packingItems (claimed in owned trips), polls, pollVotes, comments,
      // activities, stages, transports, pushSubscriptions, notificationPreferences, tripMutes
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
