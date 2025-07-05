import { formatCurrency } from "@/lib/utils";
import type { MinimizedTicketType } from "@/schema";

interface TicketBreakdownProps {
  ticket: MinimizedTicketType;
  quantity: number;
  className?: string;
}

export default function TicketBreakdown({
  ticket,
  quantity,
  className = "",
}: TicketBreakdownProps) {
  if (quantity === 0) return null;

  const ticketSubtotal = ticket.price * quantity;
  const ticketServiceFee = ticket.serviceFee * quantity;
  const ticketTotal = ticketSubtotal + ticketServiceFee;

  return (
    <div className={`text-sm space-y-1 ${className}`}>
      <div className="flex justify-between">
        <span className="text-gray-600">
          {quantity}x {ticket.name}
        </span>
        <span>{formatCurrency(ticketSubtotal)}</span>
      </div>
      {ticket.serviceFee > 0 && (
        <div className="flex justify-between text-gray-500">
          <span>Service fee ({quantity}x)</span>
          <span>{formatCurrency(ticketServiceFee)}</span>
        </div>
      )}
      <div className="flex justify-between font-medium text-gray-900 pt-1 border-t border-gray-100">
        <span>Subtotal</span>
        <span>{formatCurrency(ticketTotal)}</span>
      </div>
    </div>
  );
}
