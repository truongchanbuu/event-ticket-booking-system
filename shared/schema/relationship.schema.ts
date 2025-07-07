import { EventType, MinimizedEvent, TicketType } from "@/schema";
import { Customer, Purchase, PurchaseItem } from "@/schema/booking";

export type EventWithTicketTypes = EventType & {
  ticketTypes: TicketType[];
};

export type PurchaseWithDetails = Purchase & {
  customer: Customer;
  event: MinimizedEvent;
  items: PurchaseItem[];
};
