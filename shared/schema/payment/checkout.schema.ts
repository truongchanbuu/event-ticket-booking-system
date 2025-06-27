import { z } from "zod";

export const CheckoutSchema = z.object({
  userId: z.string(),
  tickets: z.array(
    z.object({
      ticketId: z.string(),
      quantity: z.number().min(1),
    })
  ),
  paymentMethod: z.enum(["credit_card", "momo"]),
});
