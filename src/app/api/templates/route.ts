import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q");

    const templates = await prisma.trip.findMany({
      where: {
        isTemplate: true,
        ...(type ? { type } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { destination: { contains: q, mode: "insensitive" } },
                { templateDescription: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: {
          select: { itinerary: true, stages: true, transports: true },
        },
      },
      orderBy: [{ templateUseCount: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
