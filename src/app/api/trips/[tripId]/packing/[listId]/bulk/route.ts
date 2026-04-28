import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canModifyItem } from "@/lib/permissions";
import { bulkUpdatePackingItemsSchema } from "@/lib/validations/packing";
import { createActivity } from "@/lib/db/activities";
import { z } from "zod";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tripId: string; listId: string }> }
) {
  try {
    const { tripId, listId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resource existence + ownership check
    const list = await prisma.packingList.findUnique({
      where: { id: listId },
      select: { id: true, tripId: true, name: true, createdById: true },
    });

    if (!list || list.tripId !== tripId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Permission check (same rules as other packing handlers)
    const allowed = await canModifyItem(tripId, session.user.id, list.createdById);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate body
    const body = await req.json();
    const { items } = bulkUpdatePackingItemsSchema.parse(body);

    // Atomic replace
    const newItems = await prisma.$transaction(async (tx) => {
      await tx.packingItem.deleteMany({ where: { packingListId: listId } });
      await tx.packingItem.createMany({
        data: items.map((item) => ({
          packingListId: listId,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          categoryEmoji: null,
        })),
      });
      return tx.packingItem.findMany({
        where: { packingListId: listId },
        include: {
          claimedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    });

    // Fire-and-forget activity log
    createActivity({
      tripId,
      userId: session.user.id,
      action: "bulk_edited",
      entityType: "packing",
      entityId: listId,
      entityName: list.name,
    }).catch(() => {});

    return NextResponse.json({ items: newItems }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Bulk packing update error:", error);
    return NextResponse.json({ error: "Failed to update packing list" }, { status: 500 });
  }
}
