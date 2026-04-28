import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { shareCode } = await params;

    const template = await prisma.packingList.findFirst({
      where: { shareCode, isTemplate: true },
      include: {
        items: {
          orderBy: [{ category: "asc" }, { createdAt: "asc" }],
        },
        createdBy: { select: { id: true, name: true, email: true } },
        trip: { select: { type: true } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get packing template error:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing template" },
      { status: 500 }
    );
  }
}
