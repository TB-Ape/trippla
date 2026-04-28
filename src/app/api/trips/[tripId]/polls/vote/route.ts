import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVote, deleteVote } from "@/lib/db/polls";
import { createActivity } from "@/lib/db/activities";
import { prisma } from "@/lib/prisma";
import { voteSchema } from "@/lib/validations/poll";
import { z } from "zod";

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

    const body = await req.json();
    const validatedData = voteSchema.parse(body);

    const vote = await createVote({
      optionId: validatedData.optionId,
      userId: session.user.id,
    });

    // Get poll question for the activity log
    const option = await prisma.pollOption.findUnique({
      where: { id: validatedData.optionId },
      include: { poll: { select: { question: true } } },
    });

    createActivity({
      tripId,
      userId: session.user.id,
      action: "voted",
      entityType: "poll",
      entityId: vote.pollId,
      entityName: option?.poll.question,
    }).catch(() => {});

    return NextResponse.json({ vote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Vote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to vote" },
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
    const optionId = searchParams.get("optionId");

    if (!optionId) {
      return NextResponse.json({ error: "Option ID required" }, { status: 400 });
    }

    await deleteVote(optionId, session.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete vote error:", error);
    return NextResponse.json(
      { error: "Failed to delete vote" },
      { status: 500 }
    );
  }
}
