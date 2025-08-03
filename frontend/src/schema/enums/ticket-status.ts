import { z } from "zod";

export enum TICKET_STATUS {
  ACTIVE = "ACTIVE",
  USED = "USED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export const TicketStatusEnum = z.nativeEnum(TICKET_STATUS);
export type TicketStatus = z.infer<typeof TicketStatusEnum>;
