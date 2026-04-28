import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById, getMemberRole } from "@/lib/db/trips";
import {
  getTripPackingLists,
  createPackingList,
  deletePackingList,
} from "@/lib/db/packing";
import { createPackingListSchema } from "@/lib/validations/packing";
import { createActivity } from "@/lib/db/activities";
import { sendTripNotifications } from "@/lib/notifications";
import { canModifyItem } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

    const [lists, userRole] = await Promise.all([
      getTripPackingLists(tripId, session.user.id),
      getMemberRole(tripId, session.user.id),
    ]);

    return NextResponse.json({ lists, userRole }, { status: 200 });
  } catch (error) {
    console.error("Get packing lists error:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing lists" },
      { status: 500 }
    );
  }
}

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

    // Verify user has access to this trip
    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = createPackingListSchema.parse(body);

    const list = await createPackingList({
      tripId: tripId,
      name: validatedData.name,
      isPrivate: validatedData.isPrivate,
      createdById: session.user.id,
      ...(validatedData.tripCategory ? { tripCategory: validatedData.tripCategory } : {}),
    });

    if (!trip.isTemplateStore) {
      createActivity({
        tripId,
        userId: session.user.id,
        action: "created",
        entityType: "packing",
        entityId: list.id,
        entityName: list.name,
      }).catch(() => {});
      sendTripNotifications(tripId, session.user.id, "packing", list.name, "created");
    }

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create packing list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create packing list" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await req.json();
    const { id, isTemplate, templateDescription, tripCategory } = body as {
      id: string;
      isTemplate: boolean;
      templateDescription?: string | null;
      tripCategory?: string | null;
    };

    if (!id) {
      return NextResponse.json({ error: "List ID required" }, { status: 400 });
    }

    const existing = await prisma.packingList.findUnique({
      where: { id },
      select: { tripId: true, createdById: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Only the creator can publish/unpublish
    if (existing.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const list = await prisma.packingList.update({
      where: { id },
      data: {
        isTemplate,
        templateDescription: templateDescription ?? null,
        ...(tripCategory !== undefined ? { tripCategory: tripCategory ?? null } : {}),
      },
      select: {
        id: true,
        name: true,
        isPrivate: true,
        isTemplate: true,
        templateDescription: true,
        templateUseCount: true,
        shareCode: true,
        createdById: true,
      },
    });

    return NextResponse.json({ list }, { status: 200 });
  } catch (error) {
    console.error("Patch packing list error:", error);
    return NextResponse.json(
      { error: "Failed to update packing list" },
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
      return NextResponse.json({ error: "List ID required" }, { status: 400 });
    }

    const existing = await prisma.packingList.findUnique({
      where: { id },
      select: {
        tripId: true,
        createdById: true,
        trip: { select: { isTemplateStore: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deletePackingList(id);

    if (!existing.trip?.isTemplateStore) {
      createActivity({
        tripId: deleted.tripId,
        userId: session.user.id,
        action: "deleted",
        entityType: "packing",
        entityId: deleted.id,
        entityName: deleted.name,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete packing list error:", error);
    return NextResponse.json(
      { error: "Failed to delete packing list" },
      { status: 500 }
    );
  }
}
