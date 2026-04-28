import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const type = searchParams.get("type");

    const templates = await prisma.packingList.findMany({
      where: {
        isTemplate: true,
        isPrivate: false,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { templateDescription: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { items: true } },
        trip: { select: { type: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ templateUseCount: "desc" }, { createdAt: "desc" }],
    });

    // Post-filter by type: use tripCategory if set, otherwise fall back to trip.type
    const filtered = type
      ? templates.filter((t) => (t.tripCategory ?? t.trip?.type) === type)
      : templates;

    return NextResponse.json({ templates: filtered });
  } catch (error) {
    console.error("Get packing templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing templates" },
      { status: 500 }
    );
  }
}
