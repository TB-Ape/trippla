import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberRole, updateMemberRole } from "@/lib/db/trips";
import { createActivity } from "@/lib/db/activities";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";

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

    const callerRole = await getMemberRole(tripId, session.user.id);
    if (!callerRole || callerRole === MemberRole.MEMBER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId, role } = await req.json();

    if (!memberId || !role) {
      return NextResponse.json({ error: "memberId and role required" }, { status: 400 });
    }

    if (role !== MemberRole.ADMIN && role !== MemberRole.MEMBER) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Look up target member
    const target = await prisma.tripMember.findUnique({
      where: { id: memberId, tripId },
      select: { userId: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (target.userId === session.user.id) {
      return NextResponse.json({ error: "Cannot change own role" }, { status: 400 });
    }

    if (target.role === MemberRole.OWNER) {
      return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });
    }

    const updated = await updateMemberRole(tripId, memberId, role);

    createActivity({
      tripId,
      userId: session.user.id,
      action: "updated",
      entityType: "member",
      entityId: updated.id,
      entityName: updated.user.name || updated.user.email,
    }).catch(() => {});

    return NextResponse.json({ member: updated }, { status: 200 });
  } catch (error) {
    console.error("Update member role error:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}
