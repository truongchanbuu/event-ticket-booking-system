import { EventType, MinimizedEvent, MinimizedTicketType } from "@/schema";
import { Customer, Purchase, PurchaseItem } from "@/schema/booking";

export type EventWithTicketTypes = EventType & {
  ticketTypes: MinimizedTicketType[];
};

export type PurchaseWithDetails = Purchase & {
  customer: Customer;
  event: MinimizedEvent;
  items: PurchaseItem[];
};
