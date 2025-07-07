import { Customer, PurchaseItem, Purchase } from "./booking";
import { EventType, MinimizedEvent } from "./events";
import { TicketType } from "./tickets";

export type EventWithTicketTypes = EventType & {
  ticketTypes: TicketType[];
};

export type PurchaseWithDetails = Purchase & {
  customer?: Customer;
  event: MinimizedEvent;
  items: PurchaseItem[];
};
