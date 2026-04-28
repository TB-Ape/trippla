import { z } from "zod";

export const expenseSplitSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().positive("Split amount must be positive"),
});

export const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(["food", "accommodation", "transport", "activity", "other"]).optional(),
  date: z.string().min(1, "Date is required"),
  splitType: z.enum(["equal", "custom"]),
  splits: z.array(expenseSplitSchema).optional(),
}).refine(
  (data) => {
    // If custom split, splits must be provided and sum to total amount
    if (data.splitType === "custom") {
      if (!data.splits || data.splits.length === 0) {
        return false;
      }
      const splitSum = data.splits.reduce((sum, split) => sum + split.amount, 0);
      return Math.abs(splitSum - data.amount) < 0.01; // Allow for floating point errors
    }
    return true;
  },
  {
    message: "Custom splits must sum to the total amount",
  }
);

export const updateExpenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200, "Description too long").optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  category: z.enum(["food", "accommodation", "transport", "activity", "other"]).optional(),
  date: z.string().optional(),
  splitType: z.enum(["equal", "custom"]).optional(),
  splits: z.array(expenseSplitSchema).optional(),
  memberIds: z.array(z.string()).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseSplitInput = z.infer<typeof expenseSplitSchema>;
