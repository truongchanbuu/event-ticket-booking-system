import { optional, z } from "zod";

export const TicketTypeSchema = z.object({
  typeID: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().nonnegative(),
  serviceFee: z.number().default(0),
  remaining: z.number().int().nonnegative(),
  maxPerPerson: z.number().int().nonnegative().default(1),
});

export type TicketType = z.infer<typeof TicketTypeSchema>;
