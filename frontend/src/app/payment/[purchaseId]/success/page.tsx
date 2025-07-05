"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Check,
  Home,
  MapPin,
  Ticket,
  User,
  Hash,
  ChevronDown,
  ChevronUp,
  TicketX,
} from "lucide-react";
import { Dialog, DialogTitle } from "@headlessui/react";

import { formatCurrency, formatDate } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@headlessui/react";
import { PurchaseItem } from "@/schema/booking";
import { PurchaseWithDetails, timestampSchema } from "@/schema";
import PAYMENT_STATUS from "@/schema/enums/payment-status";

// Mock data
const mockPurchaseWithDetails: PurchaseWithDetails = {
  id: "purchase_001",
  userId: "user_abc",
  eventId: "event_xyz",
  totalPrice: 200,
  paymentStatus: PAYMENT_STATUS.SUCCESS,
  paymentUrl: "https://example.com/qrcode/purchase_001",

  customer: {
    name: "Alice Example",
    email: "alice@example.com",
    phone: "+84123456789",
    dateOfBirth: "2000-05-20",
  },

  event: {
    eventID: "event_xyz",
    eventTitle: "Summer Music Festival 2024",
    thumbnails: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac",
    ],
    location: "Ho Chi Minh City, Vietnam",
    startTime: Timestamp.fromDate(new Date()),
  },

  items: [
    {
      purchaseId: "1",
      ticketTypeId: "1",
      ticketTypeName: "VIP",
      quantity: 10,
      unitPrice: 50,
      serviceFee: 5,
      qrCode: "qr_123",
    },
    {
      purchaseId: "1",
      ticketTypeId: "2",
      ticketTypeName: "Standard",
      quantity: 1,
      unitPrice: 100,
      serviceFee: 10,
      qrCode: "qr_3333",
    },
  ],
};

function GoBackHomeButton(
  goHome,
  className = "flex-1 flex items-center justify-center gap-2 h-11 min-w-0 bg-white hover:bg-gray-50 text-gray-700 rounded-sm border border-gray-300 shadow-md hover:shadow-lg transition-shadow"
) {
  return (
    <Button onClick={goHome} className={className}>
      <Home className="h-5 w-5 flex-shrink-0" />
      <span className="truncate">Back to Home</span>
    </Button>
  );
}

const INITIAL_TICKETS_SHOW = 6;
export default function SuccessPage() {
  const purchase: PurchaseWithDetails = mockPurchaseWithDetails;
  const router = useRouter();
  // TODO: Open when production
  // const { purchaseId } = useParams();

  const [showAllTickets, setShowAllTickets] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [reviewType, setReviewType] = useState<"all" | "selected" | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const goHome = () => router.replace("/");
  const tickets = mockPurchaseWithDetails.items;

  if (!tickets || tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-500 py-12 block print:hidden">
        <TicketX className="w-12 h-12 mb-4 text-red-400" />
        <p className="text-xl font-semibold">You have no tickets yet</p>
        <p className="text-md text-gray-400 mt-1">Let's take some events!</p>
        <Button
          onClick={goHome}
          className="flex gap-2 justify-center items-center p-4 mt-3 border rounded-full hover:shadow-xl"
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">Back to Home</span>
        </Button>
      </div>
    );
  }

  const displayedTickets = showAllTickets
    ? tickets
    : tickets.slice(0, INITIAL_TICKETS_SHOW);
  const remainingTickets = tickets.length - INITIAL_TICKETS_SHOW;

  // TODO: Open when production
  // const { data: purchase, isLoading } = useQuery<PurchaseWithDetails>({
  //   queryKey: [`/api/purchases/${purchaseId}`],
  //   queryFn: (): Promise<PurchaseWithDetails> =>
  //     Promise.resolve(mockPurchaseWithDetails),
  //   enabled: Boolean(purchaseId),
  // });
  // useEffect(() => {
  //   if (!isLoading && purchase && purchase.customer.id !== user?.uid) {
  //     router.replace("/unauthorized");
  //   }
  // }, [purchase, user, isLoading]);

  // Xử lý chọn vé
  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };
  const handleSelectAll = () => {
    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(tickets.map((t) => t.ticketTypeId));
    }
  };

  const printTicketsInReview = () => {
    window.print();
  };

  return (
    <>
      {/* App wrapper, ẩn khi in */}
      <div className="min-h-screen bg-gray-50 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Success Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-white text-2xl h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Payment Successfully!
                </h2>
                <p className="text-gray-600">
                  You paid {tickets.length} tickets
                  <span className="font-semibold">
                    {purchase.event.eventTitle}
                  </span>
                </p>
              </div>

              {/* Event Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Ticket className="mr-2 h-8 w-8 text-blue-600" />
                  <span className="text-xl">Event Info</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-6 w-6 text-gray-500" />
                    <div>
                      <span className="text-gray-600">Start Time:</span>
                      <div className="font-semibold">
                        {formatDate(purchase.event.startTime.toDate())}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-6 w-6 text-gray-500" />
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <div className="font-semibold">
                        {purchase.event.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <User className="mr-2 h-6 w-6 text-gray-500" />
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <div className="font-semibold">
                        {purchase.customer.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Hash className="mr-2 h-6 w-6 text-gray-500" />
                    <div>
                      <span className="text-gray-600">Purchase Code:</span>
                      <div className="font-semibold font-mono">
                        {purchase.id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Section */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Your Tickets: {tickets.length} ticket(s)
            </h3>

            {/* Chọn tất cả */}
            <div className="flex items-center mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
              <label
                htmlFor="selectAllTickets"
                className="flex items-center gap-3 cursor-pointer w-full"
              >
                <input
                  type="checkbox"
                  id="selectAllTickets"
                  checked={selectedTickets.length === tickets.length}
                  onChange={handleSelectAll}
                  className="sr-only peer"
                />

                <div className="relative w-5 h-5 bg-white border-2 border-gray-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-200 peer-focus:ring-offset-2 transition-all duration-200 hover:border-blue-400">
                  <Check
                    className={`absolute inset-0 w-3 h-3 m-auto text-white transition-opacity duration-200 ${
                      selectedTickets.length === tickets.length
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />
                </div>

                {/* Nội dung label */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-md font-medium text-gray-900">
                      Select All Tickets
                    </span>
                    <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      {selectedTickets.length}/{tickets.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Print 1 or selected tickets
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedTickets.map((ticket, index) => (
                <Card
                  key={ticket.ticketTypeId}
                  className={`overflow-hidden transition-all duration-200 border-2 ${
                    selectedTickets.includes(ticket.ticketTypeId)
                      ? "border-blue-600 ring-2 ring-blue-200 bg-blue-50 shadow-xl"
                      : "border-gray-200 hover:border-blue-400"
                  }`}
                >
                  <label
                    htmlFor={`select-ticket-${ticket.ticketTypeId}`}
                    className="block cursor-pointer"
                  >
                    <CardContent className="p-0">
                      <input
                        type="checkbox"
                        checked={selectedTickets.includes(ticket.ticketTypeId)}
                        onChange={() => handleSelectTicket(ticket.ticketTypeId)}
                        id={`select-ticket-${ticket.ticketTypeId}`}
                        className="sr-only peer"
                      />

                      {/* Ticket Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg">
                              {ticket.ticketTypeName}
                            </h4>
                            <p className="text-blue-100 text-sm">
                              Ticket #{index + 1}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {formatCurrency(ticket.unitPrice)}
                            </div>
                            <div className="text-xs text-blue-100">
                              + {formatCurrency(ticket.serviceFee)} service fee
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* QR Code Section */}
                      <div className="p-6 text-center bg-white">
                        <div className="flex justify-center mb-4">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <QRCode value={ticket.qrCode} size={140} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            Ticket Code: {ticket.ticketTypeId}
                          </div>
                          <p className="text-xs text-gray-500">
                            Please show this QR code at entry gate
                          </p>
                        </div>
                      </div>

                      {/* Checkbox UI phía dưới bên trái */}
                      <div className="flex items-center gap-2 px-4 pb-4">
                        <div
                          className={`relative w-5 h-5 border-2 rounded-md transition-colors duration-200 ${
                            selectedTickets.includes(ticket.ticketTypeId)
                              ? "bg-blue-600 border-blue-600"
                              : "bg-white border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          <Check
                            className={`absolute inset-0 w-3 h-3 m-auto text-white transition-opacity duration-200 ${
                              selectedTickets.includes(ticket.ticketTypeId)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                        </div>
                        <span className="text-sm text-gray-700">
                          Select this ticket
                        </span>
                      </div>
                    </CardContent>
                  </label>
                </Card>
              ))}
            </div>

            {/* Show More/Less Button */}
            {tickets.length > INITIAL_TICKETS_SHOW && (
              <div className="text-center mt-6">
                <Button
                  onClick={() => setShowAllTickets(!showAllTickets)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showAllTickets ? (
                    <>
                      <ChevronUp className="mr-2 h-5 w-5" />
                      Hide tickets
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-5 w-5" />
                      View more {remainingTickets}(s)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div style={{ display: "none" }}>
            <div className="print-tickets-container">
              {tickets
                .filter((ticket) =>
                  selectedTickets.includes(ticket.ticketTypeId)
                )
                .map((ticket, idx) => {
                  const ticketRef = React.createRef<HTMLDivElement>();
                  return (
                    <div
                      key={ticket.ticketTypeId}
                      ref={ticketRef}
                      id={`ticket-print-${ticket.ticketTypeId}`}
                      className="ticket-print bg-white shadow-lg rounded-lg overflow-hidden w-full max-w-lg mx-auto mb-8 border-2 border-dashed border-gray-300 min-h-96 relative"
                      style={{ pageBreakAfter: "always" }}
                    >
                      {/* Header Section */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center">
                        <h2 className="text-xl font-bold tracking-wide">
                          EVENT TICKET
                        </h2>
                        <div className="text-sm opacity-90 mt-1">
                          {purchase.event.eventTitle}
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="p-6">
                        {/* QR Code Section */}
                        <div className="flex justify-center mb-6">
                          <div className="bg-white p-3 rounded-xl shadow-md border-2 border-gray-100">
                            <QRCode
                              value={ticket.qrCode}
                              size={140}
                              level="M"
                            />
                          </div>
                        </div>

                        {/* Ticket Details */}
                        <div className="space-y-3">
                          <div className="text-center mb-4">
                            <h3 className="text-2xl font-bold text-gray-800 mb-1">
                              {ticket.ticketTypeName}
                            </h3>
                            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-600">
                                Ticket Type:
                              </span>
                              <span className="text-sm font-semibold text-gray-800">
                                {ticket.ticketTypeName}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-600">
                                Event:
                              </span>
                              <span className="text-sm font-semibold text-gray-800 text-right max-w-48 truncate">
                                {purchase.event.eventTitle}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-600">
                                Location:
                              </span>
                              <span className="text-sm font-semibold text-gray-800 text-right max-w-48 truncate">
                                {purchase.event.location}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-600">
                                Date & Time:
                              </span>
                              <span className="text-sm font-semibold text-gray-800">
                                {formatDate(purchase.event.startTime.toDate())}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer with Ticket Code */}
                        <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">
                              TICKET CODE
                            </div>
                            <div className="font-mono text-sm font-bold text-gray-700 bg-yellow-100 px-3 py-1 rounded-full inline-block">
                              {ticket.ticketTypeId}
                            </div>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="mt-4 text-center">
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Please present this ticket at the venue entrance.
                            <br />
                            Keep this ticket safe and arrive 30 minutes early.
                          </p>
                        </div>
                      </div>

                      {/* Decorative Elements */}
                      <div className="absolute top-1/2 -left-3 w-6 h-6 bg-gray-100 rounded-full transform -translate-y-3"></div>
                      <div className="absolute top-1/2 -right-3 w-6 h-6 bg-gray-100 rounded-full transform -translate-y-3"></div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Summary and Actions */}
          <Card className="">
            <CardContent className="p-6">
              {/* Purchase Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Purchase Summary</h3>
                <div className="space-y-2">
                  {purchase.items.map((item) => (
                    <div
                      key={`${purchase.id}-${item.ticketTypeId}`}
                      className="flex justify-between py-2 border-b border-gray-100"
                    >
                      <span className="text-gray-600">
                        {item.quantity} × {item.ticketTypeName}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-gray-200">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatCurrency(purchase.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  Important Attentions:
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>
                    • Each ticket has a unique QR code. Please do not share it.
                  </li>
                  <li>• Bring your ID when attending the event.</li>
                  <li>
                    • Tickets are only valid for the date and time stated on the
                    ticket.
                  </li>
                  <li>
                    • Contact the event organizers if you encounter issues with
                    the QR code.
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 print:hidden w-full mx-auto">
                {/* Print All */}
                <button
                  className="flex-1 flex items-center justify-center gap-2 h-12 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50"
                  onClick={() => {
                    setReviewType("all");
                    setIsReviewOpen(true);
                  }}
                >
                  <Ticket className="h-5 w-5 flex-shrink-0" />
                  <span className="text-md font-medium">Print All Tickets</span>
                </button>

                {/* Print Selected */}
                <button
                  className="flex-1 flex items-center justify-center gap-2 h-12 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    setReviewType("selected");
                    setIsReviewOpen(true);
                  }}
                  disabled={selectedTickets.length === 0}
                >
                  <Ticket className="h-5 w-5 flex-shrink-0" />
                  <span className="text-md font-medium">
                    Print Selected Tickets
                  </span>
                </button>
                {/* Go Back */}
                <GoBackHomeButton goHome={goHome} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal review vé, chỉ hiện khi in */}
      <Dialog
        open={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setReviewType(null);
        }}
        id="review-ticket-modal"
        className="fixed z-50 inset-0 overflow-y-auto print:block print:static print:w-full print:h-auto print:overflow-visible"
      >
        <div className="flex items-center justify-center min-h-screen px-4 print:block print:p-0 print:m-0 print:w-full print:h-auto print:static">
          <div
            className="fixed inset-0 bg-black/40 transition-opacity duration-500 print:hidden"
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-50 p-6 print:p-0 print:shadow-none print:rounded-none print:max-w-full print:w-full print:static">
            <DialogTitle className="text-xl font-bold mb-4 print:hidden">
              Review Ticket(s) to Print
            </DialogTitle>
            <div className="max-h-[60vh] overflow-y-auto space-y-6 print:max-h-none print:overflow-visible print:space-y-0 print:block print:w-full print:static">
              {(reviewType === "all"
                ? tickets
                : tickets.filter((t) =>
                    selectedTickets.includes(t.ticketTypeId)
                  )
              ).map((ticket) => (
                <div
                  key={ticket.ticketTypeId}
                  id={`review-ticket-${ticket.ticketTypeId}`}
                  className="bg-white shadow rounded-lg border border-gray-200 p-4 relative print:shadow-none print:rounded-none print:border print:border-gray-200 print:p-4 print:mb-8 print:static"
                  style={{ pageBreakAfter: "always" }}
                >
                  {/* Header Section */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center rounded-t-lg print:rounded-none print:p-2 print:static">
                    <h2 className="text-lg font-bold tracking-wide print:text-base">
                      EVENT TICKET
                    </h2>
                    <div className="text-sm opacity-90 mt-1 print:text-xs">
                      {purchase.event.eventTitle}
                    </div>
                  </div>
                  {/* Main Content */}
                  <div className="p-4 print:p-2 print:static">
                    <div className="flex justify-center mb-4 print:mb-2 print:static">
                      <div className="bg-white p-2 rounded-xl shadow-md border-2 border-gray-100 print:shadow-none print:rounded-none print:border print:border-gray-100 print:static">
                        <QRCode value={ticket.qrCode} size={140} level="M" />
                      </div>
                    </div>
                    <div className="space-y-2 print:space-y-1 print:static">
                      <div className="text-center mb-2 print:mb-1 print:static">
                        <h3 className="text-xl font-bold text-gray-800 mb-1 print:text-base print:mb-0 print:static">
                          {ticket.ticketTypeName}
                        </h3>
                        <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full print:w-8 print:h-0.5 print:static"></div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 print:gap-1 print:static">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg print:p-1 print:rounded-none print:static">
                          <span className="text-xs font-medium text-gray-600 print:text-[10px] print:static">
                            Ticket Type:
                          </span>
                          <span className="text-xs font-semibold text-gray-800 print:text-[10px] print:static">
                            {ticket.ticketTypeName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg print:p-1 print:rounded-none print:static">
                          <span className="text-xs font-medium text-gray-600 print:text-[10px] print:static">
                            Event:
                          </span>
                          <span className="text-xs font-semibold text-gray-800 text-right max-w-32 print:text-[10px] print:max-w-full print:static">
                            {purchase.event.eventTitle}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg print:p-1 print:rounded-none print:static">
                          <span className="text-xs font-medium text-gray-600 print:text-[10px] print:static">
                            Location:
                          </span>
                          <span className="text-xs font-semibold text-gray-800 text-right max-w-32 print:text-[10px] print:max-w-full print:static">
                            {purchase.event.location}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg print:p-1 print:rounded-none print:static">
                          <span className="text-xs font-medium text-gray-600 print:text-[10px] print:static">
                            Date & Time:
                          </span>
                          <span className="text-xs font-semibold text-gray-800 print:text-[10px] print:static">
                            {formatDate(purchase.event.startTime.toDate())}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-dashed border-gray-200 print:mt-2 print:pt-1 print:static">
                      <div className="text-center print:static">
                        <div className="text-xs text-gray-500 mb-1 print:text-[10px] print:mb-0 print:static">
                          TICKET CODE
                        </div>
                        <div className="font-mono text-xs font-bold text-gray-700 bg-yellow-100 px-2 py-1 rounded-full inline-block print:text-[10px] print:px-1 print:py-0.5 print:rounded-none print:static">
                          {ticket.ticketTypeId}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center print:mt-1 print:static">
                      <p className="text-xs text-gray-500 leading-relaxed print:text-[10px] print:static">
                        Please present this ticket at the venue entrance.
                        <br />
                        Keep this ticket safe and arrive 30 minutes early.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6 print:hidden">
              <button
                className="flex-1 flex items-center justify-center gap-2 h-11 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm font-medium"
                onClick={printTicketsInReview}
              >
                Print
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 h-11 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm font-medium"
                onClick={() => {
                  setIsReviewOpen(false);
                  setReviewType(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
