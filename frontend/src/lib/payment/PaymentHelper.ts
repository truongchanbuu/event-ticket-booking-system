import { TicketQuantity } from "@/schema/tickets/ticket-quantity.schema";
import { EventWithTicketTypes } from "@event_ticket_booking_system/shared";

export default class PaymentHelper {
  public static calculateTotals(
    event: EventWithTicketTypes,
    quantities: TicketQuantity,
    promoDiscount = 0
  ) {
    if (!event) return { subtotal: 0, serviceFees: 0, total: 0 };

    let subtotal = 0;
    let serviceFees = 0;

    Object.entries(quantities).forEach(([ticketTypeId, quantity]) => {
      if (quantity > 0) {
        const ticketType = event.ticketTypes.find(
          (tt) => tt.typeID === ticketTypeId
        );

        if (ticketType) {
          subtotal += ticketType.price * quantity;
          serviceFees += ticketType.serviceFee * quantity;
        }
      }
    });

    const total = subtotal + serviceFees - promoDiscount;
    return { subtotal, serviceFees, total };
  }

  public static totalTickets(quantities: TicketQuantity): number {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  }
}
