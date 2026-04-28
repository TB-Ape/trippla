import { z } from "zod";

export const createPackingListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100, "Name too long"),
  isPrivate: z.boolean().optional().default(false),
  tripCategory: z.string().max(50).optional(),
});

export const createPackingItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100, "Name too long"),
  quantity: z.number().int().positive("Quantity must be positive").default(1),
  category: z.string().max(50, "Category name too long").optional(),
  categoryEmoji: z.string().max(10).optional(),
});

export const updatePackingItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100, "Name too long").optional(),
  quantity: z.number().int().positive("Quantity must be positive").optional(),
  category: z.string().max(50, "Category name too long").optional(),
  isPacked: z.boolean().optional(),
  claimedById: z.string().nullable().optional(),
});

export type CreatePackingListInput = z.infer<typeof createPackingListSchema>;
export type CreatePackingItemInput = z.infer<typeof createPackingItemSchema>;
export type UpdatePackingItemInput = z.infer<typeof updatePackingItemSchema>;

export const bulkUpdatePackingItemsSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1, "Item name is required").max(100, "Name too long"),
        quantity: z.number().int().positive("Quantity must be positive"),
        category: z.string().min(1, "Category is required").max(50, "Category name too long"),
      })
    )
    .max(200, "Maximum 200 items"),
});

export type BulkUpdatePackingItemsInput = z.infer<typeof bulkUpdatePackingItemsSchema>;
