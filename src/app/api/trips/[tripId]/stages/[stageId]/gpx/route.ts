import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { canModifyItem } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tripId: string; stageId: string }> }
) {
  try {
    const { tripId, stageId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      select: { tripId: true, gpxPath: true, title: true },
    });

    if (!stage || stage.tripId !== tripId) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (!stage.gpxPath) {
      return NextResponse.json({ error: "No GPX file for this stage" }, { status: 404 });
    }

    const safe = path.basename(stage.gpxPath);
    const filePath = path.join(process.cwd(), "data", "uploads", "gpx", safe);

    const buffer = await readFile(filePath);
    const filename = `${stage.title.replace(/[^a-z0-9]/gi, "_")}.gpx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tripId: string; stageId: string }> }
) {
  try {
    const { tripId, stageId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      select: { tripId: true, createdById: true, gpxPath: true },
    });

    if (!stage || stage.tripId !== tripId) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    if (!(await canModifyItem(tripId, session.user.id, stage.createdById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const gpxFile = formData.get("gpxFile") as File | null;

    if (!gpxFile || gpxFile.size === 0) {
      return NextResponse.json({ error: "No GPX file provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "data", "uploads", "gpx");
    await mkdir(uploadDir, { recursive: true });

    // Remove old GPX file if present
    if (stage.gpxPath) {
      const oldPath = path.join(uploadDir, path.basename(stage.gpxPath));
      unlink(oldPath).catch(() => {});
    }

    const filename = `${session.user.id}-${Date.now()}.gpx`;
    const bytes = await gpxFile.arrayBuffer();
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

    await prisma.stage.update({
      where: { id: stageId },
      data: { gpxPath: filename },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to upload GPX" }, { status: 500 });
  }
}
