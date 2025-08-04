import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Lock } from "lucide-react";
import type { MinimizedTicketType } from "@/schema";
import ServiceFeeDisplay from "./service-fee-display";
import TicketBreakdown from "./ticket-breakdown";
import OrderSummary from "./order-summary";
import { formatCurrency } from "@/lib/utils";

interface TicketSelectorProps {
  ticketTypes: MinimizedTicketType[];
  selectedTickets: { [key: string]: number };
  onTicketChange: (ticketId: string, quantity: number) => void;
  onBookNow: () => void;
}

export default function TicketSelector({
  ticketTypes,
  selectedTickets,
  onTicketChange,
  onBookNow,
}: TicketSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (ticketId: string, change: number) => {
    const currentQuantity = selectedTickets[ticketId] || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    const ticketType = ticketTypes.find((t) => t.typeID === ticketId);

    if (ticketType && newQuantity <= ticketType.maxPerPerson) {
      onTicketChange(ticketId, newQuantity);
    }
  };

  const getSelectedTicketCount = () => {
    return Object.values(selectedTickets).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  const handleBookNow = async () => {
    setLoading(true);
    try {
      await onBookNow();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle className="text-lg">Book Your Tickets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ticket Types */}
        <div className="space-y-4">
          {ticketTypes.map((ticket) => {
            const quantity = selectedTickets[ticket.typeID] || 0;

            return (
              <Card key={ticket.typeID} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{ticket.name}</h5>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(ticket.price)}
                      </span>
                      <ServiceFeeDisplay serviceFee={ticket.serviceFee} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {ticket.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {ticket.remaining > 0 ? (
                        <Badge variant="outline" className="text-green-600">
                          {ticket.remaining <= 10
                            ? `Only ${ticket.remaining} left`
                            : "Available"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          Sold Out
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(ticket.typeID, -1)}
                        disabled={quantity === 0 || ticket.remaining === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(ticket.typeID, 1)}
                        disabled={
                          ticket.remaining === 0 ||
                          quantity >= ticket.maxPerPerson
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Ticket Breakdown (only show if quantity > 0) */}
                  {quantity > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <TicketBreakdown ticket={ticket} quantity={quantity} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Overall Booking Summary */}
        <OrderSummary
          ticketTypes={ticketTypes}
          selectedTickets={selectedTickets}
        />

        {/* Book Now Button */}
        <Button
          onClick={handleBookNow}
          disabled={getSelectedTicketCount() === 0 || loading}
          className="w-full"
        >
          {loading ? "Processing..." : "Book Now"}
        </Button>

        <div className="text-center text-sm text-gray-500">
          <Lock className="h-4 w-4 inline mr-1" />
          Secure payment processing
        </div>
      </CardContent>
    </Card>
  );
}
