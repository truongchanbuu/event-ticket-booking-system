import { z } from "zod";
import { TicketStatusEnum } from "../enums";

export const TicketPurchaseSchema = z.object({
  ticketTypeID: z.string().min(1),
  ticketTypeName: z.string().min(1),
  quantity: z.number().int().positive("The quantity must be greater than 0"),
  purchaseDate: z.string().datetime(),
  status: TicketStatusEnum,
});

export type TicketPurchase = z.infer<typeof TicketPurchaseSchema>;
