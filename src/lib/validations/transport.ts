import { z } from "zod";

export const TRANSPORT_MODES = [
  "plane", "train", "bus", "car", "ferry", "bike", "walk", "taxi", "other",
] as const;

export const createTransportSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  mode: z.enum(TRANSPORT_MODES),
  departureLocation: z.string().min(1, "Departure location is required").max(200),
  arrivalLocation: z.string().min(1, "Arrival location is required").max(200),
  departureTime: z.string().min(1, "Departure time is required"),
  arrivalTime: z.string().min(1, "Arrival time is required"),
  bookingReference: z.string().max(100).optional(),
  notes: z.string().optional(),
  cost: z.number().min(0, "Cost must be 0 or more").optional(),
  splitMemberIds: z.array(z.string()).optional(),
}).refine(
  (data) => new Date(data.arrivalTime) >= new Date(data.departureTime),
  { message: "Arrival time must be after departure time" }
);

export type CreateTransportInput = z.infer<typeof createTransportSchema>;
