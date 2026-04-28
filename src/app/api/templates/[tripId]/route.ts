import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const template = await prisma.trip.findFirst({
      where: { id: tripId, isTemplate: true },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        itinerary: { orderBy: { startTime: "asc" } },
        transports: { orderBy: { order: "asc" } },
        stages: { orderBy: { order: "asc" } },
        packingLists: {
          include: { items: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}
