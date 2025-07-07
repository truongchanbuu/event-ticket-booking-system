"use client";

import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Receipt,
  Calendar,
  MapPin,
  Ticket,
  ExternalLink,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import PAYMENT_STATUS from "@/schema/enums/payment-status";
import PAYMENT_METHODS from "@/schema/enums/payment-method";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const TransactionDetailsUI = () => {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [showQRTickets, setShowQRTickets] = useState<{
    [key: string]: boolean;
  }>({});

  const downloadTickets = () => {
    if (printRef.current) {
      // Show all QR codes before printing
      const allTicketIds = sampleTransaction.tickets.map((ticket) => ticket.id);
      setShowQRTickets((prev) => {
        const newState = { ...prev };
        allTicketIds.forEach((id) => {
          newState[id] = true;
        });
        return newState;
      });

      // Wait for QR codes to render then print
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  // Sample data dựa trên schema
  const sampleTransaction = {
    id: "TXN123456789",
    userId: "user123",
    eventId: "event456",
    eventName: "Đêm nhạc Rock Việt 2025",
    eventDetails: {
      date: new Date("2025-07-05T18:45:00"),
      location: "Nhà hát lớn Hà Nội",
      thumbnail:
        "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=300&fit=crop",
    },
    tickets: [
      {
        id: "ticket1",
        ticketType: "VIP",
        price: 500000,
        quantity: 2,
        seatNumber: "A1, A2",
        qrCode: "QR_VIP_001",
      },
      {
        id: "ticket2",
        ticketType: "Standard",
        price: 200000,
        quantity: 1,
        seatNumber: "B5",
        qrCode: "QR_STD_001",
      },
    ],
    totalPrice: 1200000,
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    paymentMethod: PAYMENT_METHODS.MOMO,
    createdAt: new Date("2025-07-05T18:45:00"),
  };

  const getStatusIcon = (status: PAYMENT_STATUS) => {
    switch (status) {
      case PAYMENT_STATUS.SUCCESS:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case PAYMENT_STATUS.FAILED:
        return <XCircle className="w-5 h-5 text-red-500" />;
      case PAYMENT_STATUS.PENDING:
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPaymentMethodText = (method: PAYMENT_METHODS) => {
    switch (method) {
      case PAYMENT_METHODS.MOMO:
        return "MoMo Wallet";
      case PAYMENT_METHODS.CREDIT_CARD:
        return "Credit Card";
      case PAYMENT_METHODS.BANK_TRANSFER:
        return "Bank Transfer";
      case PAYMENT_METHODS.ZALOPAY:
        return "ZaloPay";
      case PAYMENT_METHODS.PAYPAL:
        return "PayPal";
      case PAYMENT_METHODS.VNPAY:
        return "VNPay";
      case PAYMENT_METHODS.CASH:
        return "Cash";
      default:
        return method;
    }
  };

  const toggleQR = (ticketId: string) => {
    setShowQRTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section,
          .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .ticket-card {
            page-break-inside: avoid;
            margin-bottom: 20px;
            border: 2px solid #000;
            padding: 20px;
            background: white;
          }
          .qr-code {
            display: block !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 no-print">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Payment History</span>
            </Button>
          </div>

          {/* Print Section */}
          <div ref={printRef} className="print-section">
            {/* Print Header */}
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-2xl font-bold text-black mb-2">
                Event Tickets
              </h1>
              <p className="text-gray-600">
                Transaction ID: {sampleTransaction.id}
              </p>
              <p className="text-gray-600">
                Purchased: {formatDateTime(sampleTransaction.createdAt)}
              </p>
            </div>

            {/* Transaction Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 no-print">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="w-6 h-6 text-blue-600" />
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Transaction Details
                  </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Transaction ID
                      </p>
                      <p className="font-medium text-gray-900">
                        #{sampleTransaction.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Payment Method
                      </p>
                      <p className="font-medium text-gray-900">
                        {getPaymentMethodText(sampleTransaction.paymentMethod)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Price</p>
                      <p className="font-semibold text-lg text-gray-900">
                        {formatCurrency(sampleTransaction.totalPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(sampleTransaction.paymentStatus)}
                        <span className="font-medium text-gray-900">
                          {sampleTransaction.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Purchased At</p>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(sampleTransaction.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tickets Purchased Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 no-print">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Ticket className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Ticket Purchase
                  </h2>
                </div>

                {/* Event Info */}
                <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <img
                      src={sampleTransaction.eventDetails.thumbnail}
                      alt={sampleTransaction.eventName}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {sampleTransaction.eventName}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(sampleTransaction.eventDetails.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{sampleTransaction.eventDetails.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="space-y-4 mb-6">
                  {sampleTransaction.tickets.map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="ticket-card border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {ticket.ticketType}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Quantity: {ticket.quantity}
                          </p>
                          {ticket.seatNumber && (
                            <p className="text-sm text-gray-600">
                              Seat: {ticket.seatNumber}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(ticket.price * ticket.quantity)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(ticket.price)}/ticket
                          </p>
                        </div>
                      </div>

                      {/* QR Code for each ticket */}
                      <div className="mt-4">
                        <button
                          onClick={() => toggleQR(ticket.id)}
                          className="no-print flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                          {showQRTickets[ticket.id] ? "Hide QR" : "Show QR"}
                        </button>

                        <div
                          className={`qr-code ${showQRTickets[ticket.id] ? "block" : "hidden"} print:block mt-3 p-4 bg-gray-50 rounded-lg text-center`}
                        >
                          <div className="inline-block p-3 bg-white rounded-lg shadow-sm">
                            <div className="w-24 h-24 bg-gray-300 rounded-lg flex items-center justify-center">
                              <QRCode value={ticket.qrCode} size={160} />
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">
                            QR Code: {ticket.qrCode}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ticket.ticketType} -{" "}
                            {ticket.seatNumber || "No seat"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 no-print">
                  <button
                    onClick={() =>
                      router.push(`/events/${sampleTransaction.eventId}`)
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View event details
                  </button>

                  <button
                    onClick={downloadTickets}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download all tickets
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransactionDetailsUI;
