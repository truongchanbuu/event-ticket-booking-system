import { optional, z } from "zod";

export const MinimizedTicket = z.object({
  typeID: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().nonnegative(),
  serviceFee: z.number().default(0),
  remaining: z.number().int().nonnegative(),
  qrCode: z.string(),
});

export type MinimizedTicketType = z.infer<typeof MinimizedTicket>;
