import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { shareCode } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tripId } = body as { tripId: string };

    if (!tripId) {
      return NextResponse.json({ error: "tripId is required" }, { status: 400 });
    }

    // Verify user is a member of the target trip
    const membership = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the template
    const template = await prisma.packingList.findFirst({
      where: { shareCode, isTemplate: true },
      include: { items: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newList = await tx.packingList.create({
        data: {
          tripId,
          name: template.name,
          isPrivate: false,
          isTemplate: false,
          createdById: session.user.id,
        },
      });

      if (template.items.length > 0) {
        await tx.packingItem.createMany({
          data: template.items.map((item) => ({
            packingListId: newList.id,
            name: item.name,
            quantity: item.quantity,
            category: item.category,
            categoryEmoji: item.categoryEmoji,
            isPacked: false,
            claimedById: null,
          })),
        });
      }

      await tx.packingList.update({
        where: { id: template.id },
        data: { templateUseCount: { increment: 1 } },
      });

      return tx.packingList.findUnique({
        where: { id: newList.id },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });
    });

    return NextResponse.json({ list: result }, { status: 201 });
  } catch (error) {
    console.error("Use packing template error:", error);
    return NextResponse.json(
      { error: "Failed to add template to trip" },
      { status: 500 }
    );
  }
}
