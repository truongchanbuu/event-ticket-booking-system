import { formatCurrency } from "@/lib/utils";
import type { MinimizedTicketType } from "@/schema";

interface OrderSummaryProps {
  ticketTypes: MinimizedTicketType[];
  selectedTickets: { [key: string]: number };
  className?: string;
}

export default function OrderSummary({
  ticketTypes,
  selectedTickets,
  className = "",
}: OrderSummaryProps) {
  const calculateSubtotal = () => {
    return ticketTypes.reduce((total, ticket) => {
      const quantity = selectedTickets[ticket.typeID] || 0;
      return total + ticket.price * quantity;
    }, 0);
  };

  const calculateTotalServiceFee = () => {
    return ticketTypes.reduce((total, ticket) => {
      const quantity = selectedTickets[ticket.typeID] || 0;
      return total + ticket.serviceFee * quantity;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTotalServiceFee();
  };

  const getSelectedTicketCount = () => {
    return Object.values(selectedTickets).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  const subtotal = calculateSubtotal();
  const totalServiceFee = calculateTotalServiceFee();
  const total = calculateTotal();
  const selectedCount = getSelectedTicketCount();

  if (selectedCount === 0) return null;

  return (
    <div className={`border-t border-gray-200 pt-4 ${className}`}>
      <h6 className="font-medium text-gray-900 mb-3">Order Summary</h6>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {totalServiceFee > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Service Fees:</span>
            <span className="font-medium">
              {formatCurrency(totalServiceFee)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-2">
          <span>Total:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
