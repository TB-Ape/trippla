import { z } from "zod";

export const createStageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  date: z.string().optional(),
  description: z.string().optional(),
  startLocation: z.string().max(200).optional(),
  endLocation: z.string().max(200).optional(),
  distance: z.number().positive("Distance must be positive").optional(),
  elevationGain: z.number().int().min(0, "Elevation must be 0 or more").optional(),
  elevationLoss: z.number().int().min(0, "Elevation must be 0 or more").optional(),
  duration: z.number().positive("Duration must be positive").optional(),
  difficulty: z.enum(["easy", "moderate", "hard", "expert"]).optional(),
  accommodation: z.enum(["hut", "campsite", "hotel", "bivouac", "none"]).optional(),
});

export type CreateStageInput = z.infer<typeof createStageSchema>;
