import { z } from "zod";

export const createTripSchema = z.object({
  name: z.string().min(1, "Trip name is required").max(100, "Trip name too long"),
  description: z.string().optional(),
  destination: z.string().optional(),
  type: z.enum(["city", "beach", "camping", "hiking", "cycling", "roadtrip", "ski", "cruise"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  { message: "End date must be after start date" }
);

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const createBucketListItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().optional(),
  destination: z.string().optional(),
  type: z.enum(["city", "beach", "camping", "hiking", "cycling", "roadtrip", "ski", "cruise"]).optional(),
});

export type CreateBucketListItemInput = z.infer<typeof createBucketListItemSchema>;
