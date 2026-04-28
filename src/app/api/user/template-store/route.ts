import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Find existing template store trip
  let trip = await prisma.trip.findFirst({
    where: { ownerId: userId, isTemplateStore: true },
    select: { id: true },
  });

  if (!trip) {
    try {
      trip = await prisma.trip.create({
        data: {
          name: "Personal Templates",
          ownerId: userId,
          isTemplateStore: true,
          currency: "EUR",
          members: {
            create: { userId, role: "OWNER" },
          },
        },
        select: { id: true },
      });
    } catch (err: unknown) {
      // Partial unique index violation: another request created it concurrently
      const isUniqueError =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      if (isUniqueError) {
        trip = await prisma.trip.findFirst({
          where: { ownerId: userId, isTemplateStore: true },
          select: { id: true },
        });
      } else {
        throw err;
      }
    }
  }

  if (!trip) {
    return NextResponse.json({ error: "Failed to get template store" }, { status: 500 });
  }

  return NextResponse.json({ tripId: trip.id });
}
