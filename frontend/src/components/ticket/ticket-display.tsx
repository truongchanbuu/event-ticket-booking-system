import { formatPrice } from "@/lib/utils";
import { Clock, Package, ShoppingCart, Ticket } from "lucide-react";

export function TicketTypesDisplay({ data, totalCapacity = 1000 }) {
  const getTicketStatus = (ticket) => {
    const { remaining, isSoldOut } = ticket;
    const threshold = Math.max(5, Math.floor(totalCapacity * 0.1));

    if (isSoldOut || remaining <= 0) {
      return {
        icon: <Package className="w-4 h-4 text-gray-400" />,
        badge: "text-gray-500 bg-gray-100",
        status: "Sold Out",
      };
    }

    if (remaining <= threshold) {
      return {
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        badge: "text-amber-700 bg-amber-100",
        status: remaining === 1 ? "Last one!" : `Only ${remaining} left`,
      };
    }

    return {
      icon: <ShoppingCart className="w-4 h-4 text-green-600" />,
      badge: "text-green-700 bg-green-100",
      status: "Available",
    };
  };

  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center bg-gray-50">
        <Ticket className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No tickets available</p>
      </div>
    );
  }

  const availableCount = data.filter(
    (t) => !t.isSoldOut && t.remaining > 0
  ).length;
  const totalRemaining = data.reduce((sum, t) => sum + (t.remaining || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Tickets</h2>
          </div>
          <div className="text-sm text-gray-500">
            {availableCount} available(s)
          </div>
        </div>
      </div>

      {/* Ticket List */}
      <div className="divide-y">
        {data.map((ticket) => {
          const status = getTicketStatus(ticket);
          const isAvailable = !ticket.isSoldOut && ticket.remaining > 0;

          return (
            <div key={ticket.ticketTypeId} className="p-4">
              {/* Mobile Layout */}
              <div className="sm:hidden space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{ticket.name}</h3>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {formatPrice(ticket.price, ticket.currency)}
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.badge}`}
                  >
                    {status.icon}
                    <span>{status.status}</span>
                  </div>
                </div>
                <button
                  disabled={!isAvailable}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    isAvailable
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isAvailable ? "Select" : "Sold Out"}
                </button>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.badge}`}
                  >
                    {status.icon}
                    <span>{status.status}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{ticket.name}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatPrice(ticket.price, ticket.currency)}
                  </div>
                  <button
                    disabled={!isAvailable}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isAvailable
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isAvailable ? "Select" : "Sold Out"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>{totalRemaining} tickets remaining</span>
          <span>
            From{" "}
            {availableCount > 0
              ? formatPrice(
                  Math.min(
                    ...data
                      .filter((t) => !t.isSoldOut && t.remaining > 0)
                      .map((t) => t.price)
                  )
                )
              : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}
