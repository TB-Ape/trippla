import { z } from "zod";

export const pollOptionSchema = z.object({
  text: z.string().min(1, "Option text is required").max(200, "Option too long"),
});

export const createPollSchema = z.object({
  question: z.string().min(1, "Question is required").max(300, "Question too long"),
  options: z.array(pollOptionSchema).min(2, "At least 2 options required").max(10, "Maximum 10 options"),
  allowMultiple: z.boolean().default(false),
  expiresAt: z.string().optional(),
});

export const voteSchema = z.object({
  optionId: z.string().min(1, "Option ID required"),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type PollOptionInput = z.infer<typeof pollOptionSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
