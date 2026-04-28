import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { joinTripByCode } from "@/lib/db/trips";
import { z } from "zod";

const joinTripSchema = z.object({
  joinCode: z.string().min(1, "Join code is required"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { joinCode } = joinTripSchema.parse(body);

    const member = await joinTripByCode(joinCode, session.user.id);

    return NextResponse.json({ trip: member.trip }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Join trip error:", error);
    return NextResponse.json(
      { error: "Failed to join trip" },
      { status: 500 }
    );
  }
}
