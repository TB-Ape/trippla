import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserBucketList, createBucketListItem } from "@/lib/db/trips";
import { createBucketListItemSchema } from "@/lib/validations/trip";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await getUserBucketList(session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Get bucket list error:", error);
    return NextResponse.json({ error: "Failed to fetch bucket list" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createBucketListItemSchema.parse(body);

    const item = await createBucketListItem({
      ...data,
      ownerId: session.user.id,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create bucket list item error:", error);
    return NextResponse.json({ error: "Failed to create bucket list item" }, { status: 500 });
  }
}
