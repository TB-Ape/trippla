import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createPackingItem,
  updatePackingItem,
  deletePackingItem,
} from "@/lib/db/packing";
import { createPackingItemSchema, updatePackingItemSchema } from "@/lib/validations/packing";
import { createActivity } from "@/lib/db/activities";
import { sendTripNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createPackingItemSchema.parse(body);

    const item = await createPackingItem({
      packingListId: body.listId,
      name: validatedData.name,
      quantity: validatedData.quantity,
      category: validatedData.category,
      categoryEmoji: validatedData.categoryEmoji,
    });

    const packingList = await prisma.packingList.findUnique({
      where: { id: body.listId },
      select: {
        tripId: true,
        trip: { select: { isTemplateStore: true } },
      },
    });
    if (packingList) {
      if (!packingList.trip?.isTemplateStore) {
        createActivity({
          tripId: packingList.tripId,
          userId: session.user.id,
          action: "created",
          entityType: "packing",
          entityId: item.id,
          entityName: item.name,
        }).catch(() => {});
        sendTripNotifications(packingList.tripId, session.user.id, "packing", item.name, "created");
      }
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create packing item error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create packing item" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    const validatedData = updatePackingItemSchema.parse(updateData);

    const item = await updatePackingItem(id, validatedData);

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Update packing item error:", error);
    return NextResponse.json(
      { error: "Failed to update packing item" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    await deletePackingItem(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete packing item error:", error);
    return NextResponse.json(
      { error: "Failed to delete packing item" },
      { status: 500 }
    );
  }
}
