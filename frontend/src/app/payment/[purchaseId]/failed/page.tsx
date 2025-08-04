"use client";

import React from "react";
import {
  Calendar,
  X,
  Home,
  MapPin,
  Ticket,
  User,
  Hash,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  Phone,
  Mail,
} from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils";
import { APP_NAME } from "@/constants/app";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@headlessui/react";

// Mock data for failed purchase
const mockFailedPurchase = {
  id: "purchase_failed_001",
  userId: "user_abc",
  eventId: "event_xyz",
  totalPrice: 550,
  paymentStatus: "FAILED",
  failureReason: "INSUFFICIENT_FUNDS",
  failureMessage:
    "Your payment has insufficient funds to complete this transaction.",
  transactionId: "txn_abc123xyz",
  attemptedAt: new Date("2024-07-02T14:30:00Z"),

  customer: {
    fullName: "Alice Example",
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
    startTime: { toDate: () => new Date("2024-07-15T19:00:00Z") },
    endTime: { toDate: () => new Date("2024-07-15T23:00:00Z") },
  },

  items: [
    {
      id: "item_001",
      ticketTypeId: 1,
      quantity: 3,
      unitPrice: 50,
      ticketType: {
        typeID: "tt1",
        name: "Standard",
        description: "Standard entry ticket",
        price: 50,
        serviceFee: 5,
      },
    },
    {
      id: "item_002",
      ticketTypeId: 2,
      quantity: 2,
      unitPrice: 100,
      ticketType: {
        typeID: "tt2",
        name: "VIP",
        description: "VIP ticket with perks",
        price: 100,
        serviceFee: 10,
      },
    },
  ],
};

const getErrorDetails = (failureReason) => {
  switch (failureReason) {
    case "INSUFFICIENT_FUNDS":
      return {
        title: "Insufficient Funds",
        description:
          "Your card doesn't have enough balance to complete this purchase.",
        suggestions: [
          "Check your account balance",
          "Try a different payment method",
          "Contact your bank if you believe this is an error",
        ],
      };
    case "CARD_DECLINED":
      return {
        title: "Card Declined",
        description: "Your payment card was declined by the bank.",
        suggestions: [
          "Verify your card details are correct",
          "Check if your card is expired",
          "Contact your bank to authorize the transaction",
          "Try a different payment method",
        ],
      };
    case "NETWORK_ERROR":
      return {
        title: "Network Error",
        description: "There was a connection issue during payment processing.",
        suggestions: [
          "Check your internet connection",
          "Try again in a few minutes",
          "Clear your browser cache and cookies",
        ],
      };
    case "PAYMENT_TIMEOUT":
      return {
        title: "Payment Timeout",
        description: "The payment process took too long and was cancelled.",
        suggestions: [
          "Try the payment again",
          "Ensure stable internet connection",
          "Contact support if the issue persists",
        ],
      };
    default:
      return {
        title: "Payment Failed",
        description: "An unexpected error occurred during payment processing.",
        suggestions: [
          "Try the payment again",
          "Check your payment details",
          "Contact our support team for assistance",
        ],
      };
  }
};

export default function PaymentFailedPage() {
  const failedPurchase = mockFailedPurchase;
  const router = useRouter();

  const errorDetails = getErrorDetails(failedPurchase.failureReason);
  const totalTickets = failedPurchase.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // TODO: Open when production
  //   useEffect(() => {
  //     if (!isLoading && purchase && purchase.customer.id !== user?.uid) {
  //       router.replace("/unauthorized");
  //     }
  //   }, [purchase, user, isLoading]);

  const retryPayment = () => {
    router.push(`/checkout?retry=${failedPurchase.id}`);
  };

  const goHome = () => {
    router.replace("/");
  };

  const goToEvent = () => {
    router.push(`/events/${failedPurchase.eventId}`);
  };

  const contactSupport = () => {
    // You can implement mailto or redirect to support page
    window.location.href = `mailto:support@${APP_NAME.toLowerCase()}.com?subject=Payment Failed - ${failedPurchase.id}&body=Transaction ID: ${failedPurchase.transactionId}%0D%0AEvent: ${failedPurchase.event.eventTitle}%0D%0AError: ${failedPurchase.failureMessage}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Failed Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="text-white text-2xl h-8 w-8" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-md text-gray-600 mb-4">
                We couldn't process your payment for {totalTickets} ticket(s) to{" "}
                <span className="font-semibold">
                  {failedPurchase.event.eventTitle}
                </span>
              </p>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                <AlertTriangle className="text-xl w-4 h-4 mr-1" />
                Transaction ID: {failedPurchase.transactionId}
              </div>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                {errorDetails.title}
              </h3>
              <p className="text-md text-red-700 mb-4">
                {errorDetails.description}
              </p>

              {failedPurchase.failureMessage && (
                <div className="bg-red-100 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-lg text-red-800 font-mono">
                    {failedPurchase.failureMessage}
                  </p>
                </div>
              )}

              <div className="text-lg text-red-700">
                <p className="font-medium mb-2">What you can do:</p>
                <ul className="space-y-1">
                  {errorDetails.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <Ticket className="mr-2 h-6 w-6 text-blue-600" />
                <span>Event Details</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Start Time:</span>
                    <div className="font-medium">
                      {formatDate(failedPurchase.event.startTime.toDate())}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <div className="font-medium">
                      {failedPurchase.event.location}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="mr-2 h-5 w-5 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <div className="font-medium">
                      {failedPurchase.customer.fullName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Hash className="mr-2 h-5 w-5 text-gray-500" />
                  <div>
                    <span className="text-gray-600">Attempt ID:</span>
                    <div className="font-medium font-mono text-md">
                      {failedPurchase.id}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Summary */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-gray-600" />
              Failed Purchase Summary
            </h3>
            <div className="space-y-2">
              {failedPurchase.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between py-2 border-b border-gray-100"
                >
                  <div className="flex-1">
                    <span className="text-xl text-gray-900 font-medium">
                      {item.quantity} × {item.ticketType.name}
                    </span>
                    <div className="text-md text-gray-500">
                      {item.ticketType.description}
                    </div>
                    <div className="text-md text-gray-400">
                      {formatCurrency(item.unitPrice)} +
                      {formatCurrency(item.ticketType.serviceFee)} service fee
                      each
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(
                        item.quantity *
                          (item.unitPrice + item.ticketType.serviceFee)
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-gray-200">
                <span>Total Amount</span>
                <span className="text-red-600">
                  {formatCurrency(failedPurchase.totalPrice)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-md text-yellow-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                <strong>Note:</strong> No charges were made to your account. You
                can safely retry the payment.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={retryPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Retry Payment
              </Button>

              <Button
                onClick={goToEvent}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Ticket className="mr-2 h-5 w-5" />
                View Event
              </Button>

              <Button
                onClick={contactSupport}
                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Mail className="mr-2 h-5 w-5" />
                Contact Support
              </Button>

              <Button
                onClick={goHome}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Home className="mr-2 h-5 w-5" />
                Back to Home
              </Button>
            </div>

            {/* Support Information */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-medium text-gray-900 mb-3">
                Need Help?
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-600 text-md">
                  <Phone className="mr-2 h-4 w-4" />
                  <span>Support: +84 123 456 789</span>
                </div>
                <div className="flex items-center text-md text-gray-600">
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Email: support@{APP_NAME.toLowerCase()}.com</span>
                </div>
              </div>
              <p className="text-md text-gray-500 mt-2">
                Failed at:{" "}
                {new Date(failedPurchase.attemptedAt).toLocaleString("vi-VN")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
