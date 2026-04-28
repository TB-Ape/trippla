import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PACKING_ICON_MAP } from "@/lib/packingIcons";

const updateCategoryIconSchema = z.object({
  category: z.string().min(1).max(50),
  iconName: z.enum(Object.keys(PACKING_ICON_MAP) as [string, ...string[]]),
});

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
    const { category, iconName } = updateCategoryIconSchema.parse(body);

    const { count } = await prisma.packingItem.updateMany({
      where: { packingList: { tripId }, category },
      data: { categoryEmoji: iconName },
    });

    return NextResponse.json({ updated: count }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update category icon error:", error);
    return NextResponse.json({ error: "Failed to update category icon" }, { status: 500 });
  }
}
