import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { getBalanceSummary } from "@/lib/db/expenses";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this trip
    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const balances = await getBalanceSummary(tripId);

    return NextResponse.json({ balances }, { status: 200 });
  } catch (error) {
    console.error("Get balance summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance summary" },
      { status: 500 }
    );
  }
}
