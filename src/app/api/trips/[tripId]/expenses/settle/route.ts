import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";

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

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const { fromId, toId } = await req.json();

    if (!fromId || !toId) {
      return NextResponse.json({ error: "fromId and toId are required" }, { status: 400 });
    }

    // Only the creditor (toId) can mark as settled
    if (session.user.id !== toId) {
      return NextResponse.json({ error: "Only the person owed can mark as settled" }, { status: 403 });
    }

    // Mark all unpaid splits where the debtor (fromId) owes the creditor (toId)
    await prisma.expenseSplit.updateMany({
      where: {
        userId: fromId,
        isPaid: false,
        expense: {
          tripId,
          paidById: toId,
        },
      },
      data: { isPaid: true },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Settle error:", error);
    return NextResponse.json({ error: "Failed to record settlement" }, { status: 500 });
  }
}
