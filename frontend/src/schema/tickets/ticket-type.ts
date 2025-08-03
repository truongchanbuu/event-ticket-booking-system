import { z } from "zod";

export const TicketTypeSchema = z
  .object({
    ticketTypeID: z.string(),
    name: z.string().min(1, "It cannot be empty."),
    description: z.string().optional(),
    price: z.number().min(0, "It cannot be empty."),
    currency: z
      .string()
      .length(3, "Currency must be 3 character.")
      .toUpperCase(),
    totalQuantity: z.number().int().min(0, "Total quantity must be positive."),
    remainingQuantity: z
      .number()
      .int()
      .min(0, "Remaining quantity must be positive."),
    creationStatus: z.enum(["failed", "success"]),
  })
  .refine((data) => data.totalQuantity >= data.remainingQuantity, {
    message: "Remaining cannot be greater than total quantity",
    path: ["remainingQuantity"],
  });

export type TicketType = z.infer<typeof TicketTypeSchema>;
