import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById, getMemberRole } from "@/lib/db/trips";
import {
  getTripExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/db/expenses";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validations/expense";
import { createActivity } from "@/lib/db/activities";
import { sendTripNotifications } from "@/lib/notifications";
import { canModifyItem } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

    // Verify user has access to this trip
    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const [expenses, userRole] = await Promise.all([
      getTripExpenses(tripId),
      getMemberRole(tripId, session.user.id),
    ]);

    return NextResponse.json({ expenses, userRole, tripStartDate: trip.startDate }, { status: 200 });
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

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

    // Verify user has access to this trip
    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = createExpenseSchema.parse(body);

    const expense = await createExpense({
      tripId: tripId,
      description: validatedData.description,
      amount: validatedData.amount,
      category: validatedData.category,
      paidById: session.user.id,
      date: new Date(validatedData.date),
      splitType: validatedData.splitType,
      splits: validatedData.splits,
      memberIds: body.memberIds, // For equal split
    });

    createActivity({
      tripId,
      userId: session.user.id,
      action: "created",
      entityType: "expense",
      entityId: expense.id,
      entityName: expense.description,
    }).catch(() => {});
    sendTripNotifications(tripId, session.user.id, "expense", expense.description, "created");

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create expense" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Expense ID required" }, { status: 400 });
    }

    const existing = await prisma.expense.findUnique({ where: { id }, select: { tripId: true, paidById: true } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.paidById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate update data
    const validatedData = updateExpenseSchema.parse(updateData);

    // Convert date string to Date object if provided
    const data: any = { ...validatedData };
    if (validatedData.date) {
      data.date = new Date(validatedData.date);
    }
    // Pass memberIds from raw body (not in schema but needed for equal split)
    if (body.memberIds) {
      data.memberIds = body.memberIds;
    }

    const expense = await updateExpense(id, data);

    return NextResponse.json({ expense }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Update expense error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Expense ID required" }, { status: 400 });
    }

    const existing = await prisma.expense.findUnique({ where: { id }, select: { tripId: true, paidById: true } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    if (!(await canModifyItem(existing.tripId, session.user.id, existing.paidById))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteExpense(id);

    createActivity({
      tripId: deleted.tripId,
      userId: session.user.id,
      action: "deleted",
      entityType: "expense",
      entityId: deleted.id,
      entityName: deleted.description,
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
