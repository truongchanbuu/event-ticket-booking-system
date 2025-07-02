import { Customer, PurchaseItem, Purchase } from "./booking";
import { EventType, MinimizedEvent } from "./events";
import { MinimizedTicketType } from "./tickets";

export type EventWithTicketTypes = EventType & {
  ticketTypes: MinimizedTicketType[];
};

export type PurchaseWithDetails = Purchase & {
  customer: Customer;
  event: MinimizedEvent;
  items: PurchaseItem[];
};
