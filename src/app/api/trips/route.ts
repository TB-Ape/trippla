import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserTrips, createTrip } from "@/lib/db/trips";
import { createTripSchema } from "@/lib/validations/trip";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trips = await getUserTrips(session.user.id);
    const mappedTrips = trips.map(({ activities, ...trip }) => ({
      ...trip,
      latestActivityAt: activities[0]?.createdAt?.toISOString() ?? null,
    }));
    return NextResponse.json({ trips: mappedTrips }, { status: 200 });
  } catch (error) {
    console.error("Get trips error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createTripSchema.parse(body);

    const trip = await createTrip({
      name: validatedData.name,
      description: validatedData.description,
      destination: validatedData.destination,
      type: validatedData.type,
      startDate: validatedData.startDate
        ? new Date(validatedData.startDate)
        : undefined,
      endDate: validatedData.endDate
        ? new Date(validatedData.endDate)
        : undefined,
      ownerId: session.user.id,
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create trip error:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
