import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById, getMemberRole } from "@/lib/db/trips";
import {
  getTripStages,
  createStage,
  updateStage,
  deleteStage,
} from "@/lib/db/stages";
import { createStageSchema } from "@/lib/validations/stage";
import { createActivity } from "@/lib/db/activities";
import { sendTripNotifications } from "@/lib/notifications";
import { canModifyItem } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
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

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const [stages, userRole] = await Promise.all([
      getTripStages(tripId),
      getMemberRole(tripId, session.user.id),
    ]);

    return NextResponse.json({ stages, userRole, tripType: trip.type, tripStartDate: trip.startDate }, { status: 200 });
  } catch (error) {
    console.error("Get stages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages" },
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

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, unknown>;
    let gpxPath: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {
        title: formData.get("title"),
        date: formData.get("date") || undefined,
        description: formData.get("description") || undefined,
        startLocation: formData.get("startLocation") || undefined,
        endLocation: formData.get("endLocation") || undefined,
        distance: formData.get("distance") ? Number(formData.get("distance")) : undefined,
        elevationGain: formData.get("elevationGain") ? Number(formData.get("elevationGain")) : undefined,
        elevationLoss: formData.get("elevationLoss") ? Number(formData.get("elevationLoss")) : undefined,
        duration: formData.get("duration") ? Number(formData.get("duration")) : undefined,
        difficulty: formData.get("difficulty") || undefined,
        accommodation: formData.get("accommodation") || undefined,
      };

      const gpxFile = formData.get("gpxFile") as File | null;
      if (gpxFile && gpxFile.size > 0) {
        const uploadDir = path.join(process.cwd(), "data", "uploads", "gpx");
        await mkdir(uploadDir, { recursive: true });
        const filename = `${session.user.id}-${Date.now()}.gpx`;
        const bytes = await gpxFile.arrayBuffer();
        await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
        gpxPath = filename;
      }
    } else {
      body = await req.json();
    }

    const validatedData = createStageSchema.parse(body);

    const stage = await createStage({
      tripId,
      title: validatedData.title,
      date: validatedData.date ? new Date(validatedData.date) : undefined,
      description: validatedData.description,
      startLocation: validatedData.startLocation,
      endLocation: validatedData.endLocation,
      distance: validatedData.distance,
      elevationGain: validatedData.elevationGain,
      elevationLoss: validatedData.elevationLoss,
      duration: validatedData.duration,
      difficulty: validatedData.difficulty,
      accommodation: validatedData.accommodation,
      gpxPath,
      createdById: session.user.id,
    });

    createActivity({
      tripId,
      userId: session.user.id,
      action: "created",
      entityType: "stage",
      entityId: stage.id,
      entityName: stage.title,
    }).catch(() => {});
    sendTripNotifications(tripId, session.user.id, "stage", stage.title, "created");

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create stage error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stage" },
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

    const contentType = req.headers.get("content-type") || "";
    let id: string;
    let updateData: Record<string, unknown> = {};
    let newGpxPath: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      id = formData.get("id") as string;

      const stringFields = ["title", "date", "description", "startLocation", "endLocation", "difficulty", "accommodation"];
      const numberFields = ["distance", "duration", "elevationGain", "elevationLoss"];
      for (const field of stringFields) {
        const val = formData.get(field);
        if (val !== null) updateData[field] = (val as string) || null;
      }
      for (const field of numberFields) {
        const val = formData.get(field) as string | null;
        if (val !== null) updateData[field] = val ? Number(val) : null;
      }

      const gpxFile = formData.get("gpxFile") as File | null;
      if (gpxFile && gpxFile.size > 0) {
        const uploadDir = path.join(process.cwd(), "data", "uploads", "gpx");
        await mkdir(uploadDir, { recursive: true });
        const filename = `${session.user.id}-${Date.now()}.gpx`;
        const bytes = await gpxFile.arrayBuffer();
        await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
        newGpxPath = filename;
      }
    } else {
      const body = await req.json();
      id = body.id;
      const { id: _id, ...rest } = body;
      updateData = rest;
    }

    if (!id) {
      return NextResponse.json({ error: "Stage ID required" }, { status: 400 });
    }

    const existing = await prisma.stage.findUnique({ where: { id }, select: { tripId: true, createdById: true, gpxPath: true } });
    if (!existing) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert date string to Date object or null
    if ("date" in updateData) {
      updateData.date = updateData.date ? new Date(updateData.date as string) : null;
    }

    if (newGpxPath) {
      // Delete old GPX file if present
      if (existing.gpxPath) {
        const oldFilePath = path.join(process.cwd(), "data", "uploads", "gpx", existing.gpxPath);
        unlink(oldFilePath).catch(() => {});
      }
      updateData.gpxPath = newGpxPath;
    }

    const stage = await updateStage(id, updateData);

    createActivity({
      tripId: stage.tripId,
      userId: session.user.id,
      action: "updated",
      entityType: "stage",
      entityId: stage.id,
      entityName: stage.title,
    }).catch(() => {});

    return NextResponse.json({ stage }, { status: 200 });
  } catch (error) {
    console.error("Update stage error:", error);
    return NextResponse.json(
      { error: "Failed to update stage" },
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
      return NextResponse.json({ error: "Stage ID required" }, { status: 400 });
    }

    const existing = await prisma.stage.findUnique({ where: { id }, select: { tripId: true, createdById: true, gpxPath: true } });
    if (!existing) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteStage(id);

    // Clean up GPX file if present
    if (existing.gpxPath) {
      const filePath = path.join(process.cwd(), "data", "uploads", "gpx", existing.gpxPath);
      unlink(filePath).catch(() => {});
    }

    createActivity({
      tripId: deleted.tripId,
      userId: session.user.id,
      action: "deleted",
      entityType: "stage",
      entityId: deleted.id,
      entityName: deleted.title,
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete stage error:", error);
    return NextResponse.json(
      { error: "Failed to delete stage" },
      { status: 500 }
    );
  }
}
