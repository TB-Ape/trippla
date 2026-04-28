import { z } from "zod";

export const createItineraryItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  category: z.enum(["activity", "meal", "accommodation", "other"]).optional(),
  isAllDay: z.boolean().optional(),
  cost: z.number().positive().optional(),
  splitMemberIds: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.endTime) {
      return new Date(data.endTime) >= new Date(data.startTime);
    }
    return true;
  },
  { message: "End time must be after start time" }
);

export type CreateItineraryItemInput = z.infer<typeof createItineraryItemSchema>;
