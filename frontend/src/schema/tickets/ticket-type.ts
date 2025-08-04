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
    soldQuantity: z
      .number()
      .int()
      .min(0, "Remaining quantity must be positive."),
    checkInQuantity: z
      .number()
      .int()
      .min(0, "The number of checked in people must be positive")
      .default(0),
  })
  .refine((data) => data.totalQuantity >= data.soldQuantity, {
    message: "Remaining cannot be greater than total quantity",
    path: ["soldQuantity"],
  });

export type TicketType = z.infer<typeof TicketTypeSchema>;
