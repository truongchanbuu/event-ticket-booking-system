import { formatCurrency } from "@/lib/utils";
import { TicketType } from "@/schema/tickets";
import { Button } from "../ui/button";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import { AttendeeResponse, TicketTypesResponse } from "@/lib/api/events/api";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface TicketTypeListProps {
  isLoading?: boolean;
  attendeesByTicketType: TicketType[];
  refetch: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<TicketTypesResponse, Error>>;
}

export default function TicketTypeList({
  isLoading = false,
  attendeesByTicketType,
  refetch,
}: TicketTypeListProps) {
  const getStatusIcon = (percentage: number) => {
    if (percentage >= 95) return <AlertCircle className="w-4 h-4" />;
    if (percentage >= 90) return <TrendingUp className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600 bg-red-50 border-red-200";
    if (percentage >= 70)
      return "text-orange-600 bg-orange-50 border-orange-200";
    if (percentage >= 50)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header with Overview Stats */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Ticket Sales Overview
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => await refetch()}
            className="gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading ticket data...</p>
          </div>
        </div>
      ) : (
        <>
          {attendeesByTicketType.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="w-16 h-16 mx-auto mb-3" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Ticket Types Found
              </h3>
              <p className="text-gray-600 mb-4">
                There are no ticket types configured for this event.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => await refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {attendeesByTicketType.map((ticket) => {
                  const soldCount =
                    ticket.totalQuantity - ticket.remainingQuantity;
                  const soldPercentage =
                    ticket.totalQuantity > 0
                      ? (soldCount / ticket.totalQuantity) * 100
                      : 0;
                  const revenue = soldCount * ticket.price;

                  return (
                    <div
                      key={ticket.ticketTypeID}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {ticket.name}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(soldPercentage)}`}
                            >
                              {getStatusIcon(soldPercentage)}
                              {soldPercentage >= 95
                                ? "Nearly Sold Out"
                                : soldPercentage >= 90
                                  ? "Almost Full"
                                  : soldPercentage >= 50
                                    ? "Selling Well"
                                    : "Available"}
                            </span>
                          </div>
                          {ticket.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {ticket.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-900">
                            {formatCurrency(ticket.price)}
                          </span>
                          <p className="text-sm text-gray-500">per ticket</p>
                        </div>
                      </div>

                      {/* Metrics Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">
                            Revenue Generated
                          </p>
                          <p className="font-bold text-gray-900">
                            {formatCurrency(revenue)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">
                            Tickets Sold
                          </p>
                          <p className="font-bold text-gray-900">
                            {soldCount} of {ticket.totalQuantity}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">
                            Remaining
                          </p>
                          <p className="font-bold text-gray-900">
                            {ticket.remainingQuantity}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">
                            Sales Progress
                          </span>
                          <span className="font-bold text-gray-900">
                            {Math.round(soldPercentage)}% sold
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(soldPercentage)}`}
                              style={{
                                width: `${Math.min(soldPercentage, 100)}%`,
                              }}
                            />
                          </div>
                          {soldPercentage > 0 && (
                            <div
                              className="absolute top-0 h-3 w-0.5 bg-white opacity-50"
                              style={{
                                left: `${Math.min(soldPercentage, 100)}%`,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
