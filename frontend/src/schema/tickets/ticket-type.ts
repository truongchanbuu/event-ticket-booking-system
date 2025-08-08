import { z } from "zod";

export const TicketTypeSchema = z
  .object({
    ticketTypeID: z.string(),
    name: z.string().min(1, "It cannot be empty."),
    price: z.number().min(0, "It cannot be empty."),
    currency: z
      .string()
      .length(3, "Currency must be 3 character.")
      .toUpperCase(),
    totalQuantity: z
      .number()
      .int()
      .min(0, "Total quantity must be positive.")
      .default(0),
    remainingQuantity: z
      .number()
      .int()
      .min(0, "Remaining quantity must be positive.")
      .default(0),
    checkInQuantity: z
      .number()
      .int()
      .min(0, "The number of checked in people must be positive")
      .default(0),
    publishedAt: z.string().datetime().optional(),
  })
  .refine((data) => data.totalQuantity >= data.remainingQuantity, {
    message: "Remaining cannot be greater than total quantity",
    path: ["remainingQuantity"],
  });

export const TicketFormSchema = z.object({
  name: z.string().min(1, "Name cannot be empty."),
  price: z
    .number()
    .min(0, "Price must be 0 or greater.")
    .max(100_000_000, "Price must not exceed 100M.")
    .optional(),
  currency: z
    .string()
    .length(3, "Currency must be 3 characters.")
    .toUpperCase(),
  totalQuantity: z
    .number()
    .int()
    .min(1, "Total quantity must be 1 or greater."),
});

export type TicketFormData = z.infer<typeof TicketFormSchema>;
export type TicketType = z.infer<typeof TicketTypeSchema>;
