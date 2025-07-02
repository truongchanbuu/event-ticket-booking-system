"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  CalendarClock,
} from "lucide-react";
import { formatCurrency, formatDateTime, safeToDate } from "@/lib/utils";
import { Purchase } from "@/schema/booking";
import PAYMENT_STATUS from "@/schema/enums/payment-status";

// Mock data based on the Purchase schema
const mockPurchases: Purchase[] = [
  {
    id: "purchase-001",
    userId: "user-123",
    eventId: "event-001",
    eventName: "Summer Music Festival 2024",
    tickets: [
      { id: "ticket-001", ticketTypeId: "VIP", unitPrice: 150, quantity: 2 },
      { id: "ticket-002", ticketTypeId: "General", unitPrice: 75, quantity: 1 },
    ],
    totalPrice: 375,
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    paymentUrl: "https://payment.example.com/purchase-001",
  },
  {
    id: "purchase-002",
    userId: "user-123",
    eventId: "event-002",
    eventName: "Tech Conference 2024",
    tickets: [
      {
        id: "ticket-003",
        ticketTypeId: "Early Bird",
        unitPrice: 200,
        quantity: 1,
      },
    ],
    totalPrice: 200,
    paymentStatus: PAYMENT_STATUS.PENDING,
    paymentUrl: "https://payment.example.com/purchase-002",
  },
  {
    id: "purchase-003",
    userId: "user-123",
    eventId: "event-003",
    eventName: "Art Gallery Opening Night",
    tickets: [
      {
        id: "ticket-004",
        ticketTypeId: "Premium",
        unitPrice: 100,
        quantity: 2,
      },
    ],
    totalPrice: 200,
    paymentStatus: PAYMENT_STATUS.FAILED,
    paymentUrl: "https://payment.example.com/purchase-003",
    reason: "Insufficient funds in the selected payment method",
  },
  {
    id: "purchase-004",
    userId: "user-123",
    eventId: "event-004",
    eventName: "Comedy Show - Downtown",
    tickets: [
      {
        id: "ticket-005",
        ticketTypeId: "Front Row",
        unitPrice: 80,
        quantity: 4,
      },
    ],
    totalPrice: 320,
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    paymentUrl: "https://payment.example.com/purchase-004",
  },
  {
    id: "purchase-005",
    userId: "user-123",
    eventId: "event-005",
    eventName: "Wine Tasting Workshop",
    tickets: [
      {
        id: "ticket-006",
        ticketTypeId: "Standard",
        unitPrice: 60,
        quantity: 1,
      },
    ],
    totalPrice: 60,
    paymentStatus: PAYMENT_STATUS.FAILED,
    paymentUrl: "https://payment.example.com/purchase-005",
    reason: "Payment method expired",
  },
];

const StatusBadge = ({
  status,
  className = "",
}: {
  status: PAYMENT_STATUS;
  className?: string;
}) => {
  const statusConfig = {
    [PAYMENT_STATUS.SUCCESS]: {
      icon: CheckCircle,
      text: "Success",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      iconColor: "text-green-600",
    },
    [PAYMENT_STATUS.PENDING]: {
      icon: Clock,
      text: "Pending",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-600",
    },
    [PAYMENT_STATUS.FAILED]: {
      icon: XCircle,
      text: "Failed",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      iconColor: "text-red-600",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-md font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <Icon className={`w-6 h-6 ${config.iconColor}`} />
      {config.text}
    </span>
  );
};

interface PurchaseCardProps {
  purchase: Purchase;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const PurchaseCard = ({
  purchase,
  isExpanded,
  onToggleExpand,
}: PurchaseCardProps) => {
  return (
    <div className="px-2 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Quick View Header */}
      <div className="p-4 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-xl truncate">
                {purchase.eventName}
              </h3>
              <StatusBadge status={purchase.paymentStatus} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-md text-gray-600">
              <div className="flex items-center gap-2 text-md text-gray-700">
                <CalendarClock className="w-6 h-6" />
                <span>{formatDateTime(purchase.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                <span className="font-medium">
                  {formatCurrency(purchase.totalPrice)}
                </span>
              </div>
            </div>

            {purchase.paymentStatus === PAYMENT_STATUS.FAILED &&
              purchase.reason && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 rounded text-md">
                  <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700">{purchase.reason}</span>
                </div>
              )}
          </div>

          <button className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Detailed View */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="space-y-4">
            {/* Purchase Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2 text-md">
                Purchase Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-md">
                <div>
                  <span className="text-gray-600">Purchase ID:</span>
                  <span className="ml-2 font-mono text-gray-900">
                    {purchase.id}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Event ID:</span>
                  <span className="ml-2 font-mono text-gray-900">
                    {purchase.eventId}
                  </span>
                </div>
                {purchase.updatedAt && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="ml-2 text-gray-900">
                      {formatDateTime(purchase.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Breakdown */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2 text-md">
                Tickets
              </h4>
              <div className="space-y-2">
                {purchase.tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 px-3 bg-white rounded border text-md"
                  >
                    <div>
                      <span className="font-medium">{ticket.ticketTypeId}</span>
                      <span className="text-gray-600 ml-2">
                        × {ticket.quantity}
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(ticket.unitPrice * ticket.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(purchase.totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              {purchase.paymentStatus === PAYMENT_STATUS.PENDING && (
                <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-md font-medium">
                  Complete Payment
                </button>
              )}
              {purchase.paymentStatus === PAYMENT_STATUS.FAILED && (
                <button className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-md font-medium">
                  Retry Payment
                </button>
              )}
              {purchase.paymentStatus === PAYMENT_STATUS.SUCCESS && (
                <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-md font-medium">
                  View Tickets
                </button>
              )}
              <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-md font-medium">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterTabs = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { key: "ALL", label: "All", count: mockPurchases.length },
    {
      key: "SUCCESS",
      label: "Success",
      count: mockPurchases.filter(
        (p) => p.paymentStatus === PAYMENT_STATUS.SUCCESS
      ).length,
    },
    {
      key: "PENDING",
      label: "Pending",
      count: mockPurchases.filter(
        (p) => p.paymentStatus === PAYMENT_STATUS.PENDING
      ).length,
    },
    {
      key: "FAILED",
      label: "Failed",
      count: mockPurchases.filter(
        (p) => p.paymentStatus === PAYMENT_STATUS.FAILED
      ).length,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
      {filters.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`flex-1 min-w-0 px-3 py-2 rounded-md text-md font-medium transition-colors ${
            activeFilter === key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="truncate">{label}</span>
          {count > 0 && (
            <span
              className={`ml-1 text-xs ${
                activeFilter === key ? "text-gray-600" : "text-gray-400"
              }`}
            >
              ({count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

const TicketHistoryUI = () => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filter, setFilter] = useState("ALL");

  const filteredPurchases = useMemo(() => {
    const filtered =
      filter === "ALL"
        ? mockPurchases
        : mockPurchases.filter((p) => p.paymentStatus === filter);

    return [...filtered].sort((a, b) => {
      const dateA = safeToDate(a.createdAt).getTime();
      const dateB = safeToDate(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [filter, mockPurchases]);

  const toggleExpand = (purchaseId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId);
    } else {
      newExpanded.add(purchaseId);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    setExpandedItems(new Set(filteredPurchases.map((p) => p.id)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  return (
    <div className="mx-10 bg-gray-50 p-4">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Ticket History
          </h1>
          <p className="text-gray-600">
            View and manage all your ticket purchases
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterTabs activeFilter={filter} onFilterChange={setFilter} />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="text-md text-gray-600">
            {filteredPurchases.length}{" "}
            {filteredPurchases.length === 1 ? "purchase" : "purchases"} found
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="flex items-center gap-2 px-3 py-1.5 text-md text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Eye className="w-6 h-6" />
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-2 px-3 py-1.5 text-md text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <EyeOff className="w-6 h-6" />
              Collapse All
            </button>
          </div>
        </div>

        {/* Purchase List */}
        <div className="space-y-4">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <CreditCard className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No purchases found
              </h3>
              <p className="text-gray-600">
                {filter === "ALL"
                  ? "You haven't made any ticket purchases yet."
                  : `No ${filter.toLowerCase()} purchases found.`}
              </p>
            </div>
          ) : (
            filteredPurchases.map((purchase) => (
              <PurchaseCard
                key={purchase.id}
                purchase={purchase}
                isExpanded={expandedItems.has(purchase.id)}
                onToggleExpand={() => toggleExpand(purchase.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketHistoryUI;
