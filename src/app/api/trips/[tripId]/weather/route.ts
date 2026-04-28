import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { getTripItinerary } from "@/lib/db/itinerary";
import { getWeatherForTrip } from "@/lib/weather";

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

    const items = await getTripItinerary(tripId);

    // Derive date range: prefer trip dates, fall back to itinerary item dates
    const { searchParams } = new URL(req.url);
    let startDate = searchParams.get("start");
    let endDate = searchParams.get("end");

    if (!startDate || !endDate) {
      if (trip.startDate && trip.endDate) {
        startDate = trip.startDate.toISOString().split("T")[0];
        endDate = trip.endDate.toISOString().split("T")[0];
      } else if (items.length > 0) {
        const itemDates = items.map((i) => new Date(i.startTime).toISOString().split("T")[0]).sort();
        startDate = itemDates[0];
        endDate = itemDates[itemDates.length - 1];
      }
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ weather: {} });
    }

    // Need at least one location to anchor the weather lookup
    const hasLocations = trip.destination || items.some((item) => item.location);
    if (!hasLocations) {
      return NextResponse.json({ weather: {} });
    }

    const weather = await getWeatherForTrip(
      trip.destination,
      items,
      startDate,
      endDate
    );

    return NextResponse.json({ weather });
  } catch (error) {
    console.error("Weather fetch error:", error);
    return NextResponse.json({ weather: {} });
  }
}
