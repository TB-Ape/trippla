import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById, getMemberRole } from "@/lib/db/trips";
import { getTripPolls, createPoll, deletePoll } from "@/lib/db/polls";
import { createPollSchema } from "@/lib/validations/poll";
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

    const [polls, userRole] = await Promise.all([
      getTripPolls(tripId),
      getMemberRole(tripId, session.user.id),
    ]);

    return NextResponse.json({ polls, userRole }, { status: 200 });
  } catch (error) {
    console.error("Get polls error:", error);
    return NextResponse.json(
      { error: "Failed to fetch polls" },
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
    const validatedData = createPollSchema.parse(body);

    const poll = await createPoll({
      tripId: tripId,
      question: validatedData.question,
      options: validatedData.options,
      allowMultiple: validatedData.allowMultiple,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
      createdById: session.user.id,
    });

    createActivity({
      tripId,
      userId: session.user.id,
      action: "created",
      entityType: "poll",
      entityId: poll.id,
      entityName: poll.question,
    }).catch(() => {});
    sendTripNotifications(tripId, session.user.id, "poll", poll.question, "created");

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create poll error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create poll" },
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
      return NextResponse.json({ error: "Poll ID required" }, { status: 400 });
    }

    const existing = await prisma.poll.findUnique({ where: { id }, select: { tripId: true, createdById: true } });
    if (!existing) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deletePoll(id);

    createActivity({
      tripId: deleted.tripId,
      userId: session.user.id,
      action: "deleted",
      entityType: "poll",
      entityId: deleted.id,
      entityName: deleted.question,
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete poll error:", error);
    return NextResponse.json(
      { error: "Failed to delete poll" },
      { status: 500 }
    );
  }
}
