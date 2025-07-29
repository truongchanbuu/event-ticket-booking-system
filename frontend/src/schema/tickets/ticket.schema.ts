import { z } from "zod";
import { TicketStatusEnum } from "../enums/ticket-status";

export const TicketSchema = z.object({
  ticketId: z.string(),
  purchaseId: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  userId: z.string(),
  username: z.string(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string(),

  qrCode: z.string(),
  status: TicketStatusEnum,
  issuedAt: z.string(),
  usedAt: z.string().datetime().optional(),
});

export type Ticket = z.infer<typeof TicketSchema>;
