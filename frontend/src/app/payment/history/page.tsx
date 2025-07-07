"use client";

import React, { useState, useMemo } from "react";
import {
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
  Search,
  Filter,
  Calendar,
  DollarSign,
  Smartphone,
  Building2,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDateTime, safeToDate } from "@/lib/utils";
import { Purchase } from "@/schema/booking";
import PAYMENT_STATUS from "@/schema/enums/payment-status";
import PAYMENT_METHODS from "@/schema/enums/payment-method";
import { Timestamp } from "firebase/firestore";
import { PurchaseWithDetails, TICKET_STATUS } from "@/schema";

const mockPurchasesWithDetails: PurchaseWithDetails[] = [
  {
    id: "purchase-001",
    userId: "user-123",
    eventId: "event-001",
    eventName: "Summer Music Festival 2024",
    totalPrice: 375,
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    paymentMethod: PAYMENT_METHODS.MOMO,
    paymentUrl: "https://payment.example.com/purchase-001",
    createdAt: Timestamp.fromDate(new Date("2024-12-15T10:30:00Z")),
    updatedAt: Timestamp.fromDate(new Date("2024-12-15T10:35:00Z")),

    event: {
      eventID: "event-001",
      eventTitle: "Summer Music Festival 2024",
      thumbnails: [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac",
      ],
      location: "Ho Chi Minh City",
      startTime: Timestamp.fromDate(new Date("2024-12-20T18:00:00Z")),
    },

    items: [
      {
        purchaseId: "purchase-001",
        ticketTypeId: "vip-001",
        ticketTypeName: "VIP Ticket",
        quantity: 2,
        unitPrice: 150,
        serviceFee: 10,
      },
      {
        purchaseId: "purchase-001",
        ticketTypeId: "std-001",
        ticketTypeName: "Standard Ticket",
        quantity: 1,
        unitPrice: 75,
        serviceFee: 5,
      },
    ],

    tickets: [
      {
        ticketId: "ticket-001-vip-1",
        purchaseId: "purchase-001",
        eventId: "event-001",
        userId: "user-123",
        ticketTypeId: "vip-001",
        ticketTypeName: "VIP Ticket",
        qrCode: "qrcode-vip-1",
        status: TICKET_STATUS.ACTIVE,
        issuedAt: Timestamp.fromDate(new Date()),
      },
      {
        ticketId: "ticket-001-vip-2",
        purchaseId: "purchase-001",
        eventId: "event-001",
        userId: "user-123",
        ticketTypeId: "vip-001",
        ticketTypeName: "VIP Ticket",
        qrCode: "qrcode-vip-2",
        status: TICKET_STATUS.ACTIVE,
        issuedAt: Timestamp.fromDate(new Date()),
      },
      {
        ticketId: "ticket-001-std-1",
        purchaseId: "purchase-001",
        eventId: "event-001",
        userId: "user-123",
        ticketTypeId: "std-001",
        ticketTypeName: "Standard Ticket",
        qrCode: "qrcode-std-1",
        status: TICKET_STATUS.ACTIVE,
        issuedAt: Timestamp.fromDate(new Date()),
      },
    ],
  },
];

// Payment Method Display Component
const PaymentMethodDisplay = ({ method }: { method?: string }) => {
  const methodConfig = {
    [PAYMENT_METHODS.MOMO]: {
      icon: Smartphone,
      label: "MoMo",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200",
    },
    [PAYMENT_METHODS.VNPAY]: {
      icon: Building2,
      label: "VNPay",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    [PAYMENT_METHODS.ZALOPAY]: {
      icon: Smartphone,
      label: "ZaloPay",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    [PAYMENT_METHODS.CREDIT_CARD]: {
      icon: CreditCard,
      label: "Credit Card",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    [PAYMENT_METHODS.BANK_TRANSFER]: {
      icon: Building2,
      label: "Bank Transfer",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    [PAYMENT_METHODS.CASH]: {
      icon: Wallet,
      label: "Cash",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
    [PAYMENT_METHODS.PAYPAL]: {
      icon: CreditCard,
      label: "PayPal",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
  };

  if (!method) {
    return (
      <span className="text-sm text-gray-500 italic">No payment method</span>
    );
  }

  const config = methodConfig[method];
  if (!config) {
    return <span className="text-sm text-gray-500 italic">{method}</span>;
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium border ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

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
      <Icon className={`w-5 h-5 ${config.iconColor}`} />
      {config.text}
    </span>
  );
};

interface PurchaseCardProps {
  purchase: PurchaseWithDetails;
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
              <h3 className="font-semibold text-gray-900 text-lg sm:text-lg truncate">
                {purchase.eventName}
              </h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={purchase.paymentStatus} />
                <PaymentMethodDisplay method={purchase.paymentMethod} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-md text-gray-600">
              <div className="flex items-center gap-2 text-md text-gray-700">
                <CalendarClock className="w-5 h-5" />
                <span>{formatDateTime(purchase.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">
                  {formatCurrency(purchase.totalPrice)}
                </span>
              </div>
            </div>

            {purchase.paymentStatus === PAYMENT_STATUS.FAILED &&
              purchase.reason && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 rounded text-md">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
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
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="ml-2">
                    <PaymentMethodDisplay method={purchase.paymentMethod} />
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
                {purchase.items.map((ticket, index) => (
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
                  View Details
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

// Search Bar Component
const SearchBar = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder="Search by event name, purchase ID..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
      />
    </div>
  );
};

// Price Range Filter Component
const PriceRangeFilter = ({ priceRange, onPriceRangeChange }) => {
  const [isCustom, setIsCustom] = useState(false);

  const ranges = [
    { label: "All Prices", min: 0, max: Infinity },
    { label: "Under $50", min: 0, max: 50 },
    { label: "$50 - $100", min: 50, max: 100 },
    { label: "$100 - $200", min: 100, max: 200 },
    { label: "$200 - $500", min: 200, max: 500 },
    { label: "Over $500", min: 500, max: Infinity },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Price Range</label>
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-gray-400" />
        {!isCustom ? (
          <select
            value={`${priceRange.min}-${priceRange.max}`}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setIsCustom(true);
              } else {
                const [min, max] = e.target.value.split("-").map(Number);
                onPriceRangeChange({ min, max });
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
          >
            {ranges.map((range) => (
              <option key={range.label} value={`${range.min}-${range.max}`}>
                {range.label}
              </option>
            ))}
            <option value="custom">Custom Range</option>
          </select>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min === 0 ? "" : priceRange.min}
              onChange={(e) => {
                const min = e.target.value === "" ? 0 : Number(e.target.value);
                onPriceRangeChange({ ...priceRange, min });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max === Infinity ? "" : priceRange.max}
              onChange={(e) => {
                const max =
                  e.target.value === "" ? Infinity : Number(e.target.value);
                onPriceRangeChange({ ...priceRange, max });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
            />
            <button
              onClick={() => setIsCustom(false)}
              className="px-2 py-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Date Range Filter Component
const DateRangeFilter = ({ dateRange, onDateRangeChange }) => {
  const [isCustom, setIsCustom] = useState(false);

  const ranges = [
    { label: "All Time", days: Infinity },
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "Last 6 months", days: 180 },
    { label: "Last year", days: 365 },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Date Range</label>
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-400" />
        {!isCustom ? (
          <select
            value={dateRange.days}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setIsCustom(true);
              } else {
                const days =
                  e.target.value === "Infinity"
                    ? Infinity
                    : Number(e.target.value);
                onDateRangeChange({ days });
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
          >
            {ranges.map((range) => (
              <option key={range.label} value={range.days}>
                {range.label}
              </option>
            ))}
            <option value="custom">Custom Range</option>
          </select>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate || ""}
              onChange={(e) => {
                onDateRangeChange({ ...dateRange, startDate: e.target.value });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate || ""}
              onChange={(e) => {
                onDateRangeChange({ ...dateRange, endDate: e.target.value });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
            />
            <button
              onClick={() => setIsCustom(false)}
              className="px-2 py-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Status Filter Component
const StatusFilter = ({ selectedStatuses, onStatusChange }) => {
  const statuses = [
    {
      value: PAYMENT_STATUS.SUCCESS,
      label: "Success",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 border-emerald-200",
      checkColor: "text-emerald-600 focus:ring-emerald-500",
    },
    {
      value: PAYMENT_STATUS.PENDING,
      label: "Pending",
      color: "text-amber-600",
      bgColor: "bg-amber-50 border-amber-200",
      checkColor: "text-amber-600 focus:ring-amber-500",
    },
    {
      value: PAYMENT_STATUS.FAILED,
      label: "Failed",
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
      checkColor: "text-red-600 focus:ring-red-500",
    },
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-800 tracking-wide">
        Payment Status
      </label>
      <div className="space-y-2">
        {statuses.map((status) => {
          const isSelected = selectedStatuses.includes(status.value);
          return (
            <label
              key={status.value}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer
                hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                ${
                  isSelected
                    ? `${status.bgColor} shadow-sm border-opacity-60`
                    : "bg-white border-gray-200 hover:border-gray-300"
                }
              `}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onStatusChange([...selectedStatuses, status.value]);
                    } else {
                      onStatusChange(
                        selectedStatuses.filter((s) => s !== status.value)
                      );
                    }
                  }}
                  className="sr-only"
                />
                <div
                  className={`
                  w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
                  ${
                    isSelected
                      ? `${
                          status.value === PAYMENT_STATUS.SUCCESS
                            ? "bg-emerald-600 border-emerald-600"
                            : status.value === PAYMENT_STATUS.PENDING
                              ? "bg-amber-600 border-amber-600"
                              : "bg-red-600 border-red-600"
                        }`
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }
                `}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span
                className={`text-sm font-medium ${status.color} select-none`}
              >
                {status.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
// Advanced Filters Component
const AdvancedFilters = ({
  showFilters,
  onToggleFilters,
  priceRange,
  onPriceRangeChange,
  dateRange,
  onDateRangeChange,
  selectedStatuses,
  onStatusChange,
  onClearFilters,
}) => {
  return (
    <div className="space-y-4">
      <button
        onClick={onToggleFilters}
        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter className="w-5 h-5" />
        <span className="text-md font-medium">
          {showFilters ? "Hide" : "Show"} Advanced Filters
        </span>
      </button>

      {showFilters && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Advanced Filters
            </h3>
            <button
              onClick={onClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PriceRangeFilter
              priceRange={priceRange}
              onPriceRangeChange={onPriceRangeChange}
            />
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
            />
            <StatusFilter
              selectedStatuses={selectedStatuses}
              onStatusChange={onStatusChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const FilterTabs = ({
  activeFilter,
  onFilterChange,
  filteredCount,
  totalCount,
}) => {
  const filters = [
    { key: "ALL", label: "All", count: totalCount },
    {
      key: "SUCCESS",
      label: "Success",
      count: mockPurchasesWithDetails.filter(
        (p) => p.paymentStatus === PAYMENT_STATUS.SUCCESS
      ).length,
    },
    {
      key: "PENDING",
      label: "Pending",
      count: mockPurchasesWithDetails.filter(
        (p) => p.paymentStatus === PAYMENT_STATUS.PENDING
      ).length,
    },
    {
      key: "FAILED",
      label: "Failed",
      count: mockPurchasesWithDetails.filter(
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
              ({key === "ALL" ? filteredCount : count})
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
  const [dateRange, setDateRange] = useState({
    days: Infinity,
    startDate: "",
    endDate: "",
  });
  const [selectedStatuses, setSelectedStatuses] = useState([
    PAYMENT_STATUS.SUCCESS,
    PAYMENT_STATUS.PENDING,
    PAYMENT_STATUS.FAILED,
  ]);

  // Filtered purchases logic
  const filteredPurchases = useMemo(() => {
    let filtered = mockPurchasesWithDetails;

    // Filter by status (from advanced filters)
    filtered = filtered.filter((p) =>
      selectedStatuses.includes(p.paymentStatus)
    );

    // Filter by search
    if (searchTerm.trim()) {
      const lower = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.eventName.toLowerCase().includes(lower) ||
          p.id.toLowerCase().includes(lower)
      );
    }

    // Filter by price
    filtered = filtered.filter(
      (p) => p.totalPrice >= priceRange.min && p.totalPrice <= priceRange.max
    );

    // Filter by date
    if (dateRange.days !== Infinity) {
      const now = new Date();
      filtered = filtered.filter((p) => {
        const created = p.createdAt.toDate();
        const diffDays =
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= dateRange.days;
      });
    } else if (dateRange.startDate && dateRange.endDate) {
      // Custom date range
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59); // End of day

      filtered = filtered.filter((p) => {
        const created = p.createdAt.toDate();
        return created >= startDate && created <= endDate;
      });
    }

    // Sort by date desc
    return [...filtered].sort((a, b) => {
      const dateA = safeToDate(a.createdAt).getTime();
      const dateB = safeToDate(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [selectedStatuses, searchTerm, priceRange, dateRange]);

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

  const handleClearFilters = () => {
    setPriceRange({ min: 0, max: Infinity });
    setDateRange({
      days: Infinity,
      startDate: "",
      endDate: "",
    });
    setSelectedStatuses([
      PAYMENT_STATUS.SUCCESS,
      PAYMENT_STATUS.PENDING,
      PAYMENT_STATUS.FAILED,
    ]);
  };

  return (
    <div className="mx-10 bg-gray-50 p-4">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-2xl font-bold text-gray-900 mb-2">
            Ticket History
          </h1>
          <p className="text-gray-600">
            View and manage all your ticket purchases
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          </div>
          <div className="flex items-center gap-2">
            <AdvancedFilters
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((v) => !v)}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              selectedStatuses={selectedStatuses}
              onStatusChange={setSelectedStatuses}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>

        {/* Filters Tabs */}
        <div className="mb-6">
          <FilterTabs
            activeFilter={filter}
            onFilterChange={setFilter}
            filteredCount={filteredPurchases.length}
            totalCount={mockPurchasesWithDetails.length}
          />
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
              <Eye className="w-5 h-5" />
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-2 px-3 py-1.5 text-md text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <EyeOff className="w-5 h-5" />
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
