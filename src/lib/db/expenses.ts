import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function getTripExpenses(tripId: string) {
  return await prisma.expense.findMany({
    where: {
      tripId: tripId,
    },
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      splits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
}

export async function createExpense(data: {
  tripId: string;
  description: string;
  amount: number;
  category?: string;
  paidById: string;
  date: Date;
  splitType: "equal" | "custom";
  splits?: { userId: string; amount: number }[];
  memberIds?: string[]; // For equal split, list of member IDs
}) {
  // Convert number to Decimal for Prisma
  const amountDecimal = new Decimal(data.amount);

  // Calculate splits
  let splitData: { userId: string; amount: Decimal }[];

  if (data.splitType === "equal" && data.memberIds) {
    // Equal split among specified members
    const splitAmount = amountDecimal.dividedBy(data.memberIds.length);
    splitData = data.memberIds.map((userId) => ({
      userId,
      amount: splitAmount,
    }));
  } else if (data.splitType === "custom" && data.splits) {
    // Custom split amounts
    splitData = data.splits.map((split) => ({
      userId: split.userId,
      amount: new Decimal(split.amount),
    }));
  } else {
    throw new Error("Invalid split configuration");
  }

  return await prisma.expense.create({
    data: {
      tripId: data.tripId,
      description: data.description,
      amount: amountDecimal,
      category: data.category || "other",
      paidById: data.paidById,
      date: data.date,
      splits: {
        create: splitData,
      },
    },
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      splits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export async function updateExpense(
  id: string,
  data: {
    description?: string;
    amount?: number;
    category?: string;
    date?: Date;
    splitType?: "equal" | "custom";
    splits?: { userId: string; amount: number }[];
    memberIds?: string[];
  }
) {
  const { splitType, splits, memberIds, ...rest } = data;
  const updateData: any = { ...rest };

  // Convert amount to Decimal if provided
  if (data.amount !== undefined) {
    updateData.amount = new Decimal(data.amount);
  }

  // Handle split updates
  if (splitType === "equal" && memberIds && memberIds.length > 0) {
    const amountDecimal = updateData.amount ?? (await prisma.expense.findUnique({ where: { id }, select: { amount: true } }))!.amount;
    const splitAmount = new Decimal(amountDecimal).dividedBy(memberIds.length);
    updateData.splits = {
      deleteMany: {},
      create: memberIds.map((userId) => ({ userId, amount: splitAmount })),
    };
  } else if (splitType === "custom" && splits && splits.length > 0) {
    updateData.splits = {
      deleteMany: {},
      create: splits.map((s) => ({ userId: s.userId, amount: new Decimal(s.amount) })),
    };
  }

  return await prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      splits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export async function deleteExpense(id: string) {
  return await prisma.expense.delete({
    where: { id },
  });
}

export interface Balance {
  userId: string;
  userName: string;
  userEmail: string;
  balance: number; // Positive means they are owed money, negative means they owe money
}

export async function getBalanceSummary(tripId: string): Promise<Balance[]> {
  const expenses = await prisma.expense.findMany({
    where: { tripId },
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      splits: {
        where: { isPaid: false },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Calculate balances: for each split, the payer is owed that amount from the splitter.
  // The payer's own share is excluded (they already paid it — no inter-person debt).
  const balanceMap = new Map<string, { name: string; email: string; balance: number }>();

  const ensure = (id: string, name: string, email: string) => {
    if (!balanceMap.has(id)) {
      balanceMap.set(id, { name, email, balance: 0 });
    }
  };

  expenses.forEach((expense) => {
    const payerId = expense.paidBy.id;
    ensure(payerId, expense.paidBy.name || "", expense.paidBy.email);

    expense.splits.forEach((split) => {
      const splitAmount = split.amount.toNumber();
      const debtorId = split.user.id;
      ensure(debtorId, split.user.name || "", split.user.email);

      // Own share creates no inter-person debt
      if (payerId === debtorId) return;

      // Payer is owed this amount by the debtor
      balanceMap.get(payerId)!.balance += splitAmount;
      // Debtor owes this amount to the payer
      balanceMap.get(debtorId)!.balance -= splitAmount;
    });
  });

  // Convert to array
  return Array.from(balanceMap.entries()).map(([userId, data]) => ({
    userId,
    userName: data.name,
    userEmail: data.email,
    balance: data.balance,
  }));
}
