"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FormProvider } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import CountdownTimer from "@/components/payment/countdown-timer";
import {
  Calendar,
  MapPin,
  History,
  User,
  Plus,
  Minus,
  CreditCard,
  Smartphone,
  Lock,
} from "lucide-react";

import PaymentHelper from "@/lib/payment/PaymentHelper";
import EventThumbnail from "@/components/event/event-thumb";
import EventNotFound from "@/components/event/event-not-found";
import { TicketQuantity } from "@/schema/tickets/ticket-quantity.schema";
import { Timestamp } from "firebase/firestore";
import { usePaymenntCustomerForm } from "@/hooks/use-payment-customer-form";
import { PaymentCustomerFormInfo } from "@/schema/payments/payment-customer-form.schema";
import PaymentCustomerInfo from "@/components/payment/custom-info-card";
import { APP_NAME, REDIRECT_TIME } from "@/constants/app";
import { EventWithTicketTypes, MinimizedTicketType } from "@/schema";

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<TicketQuantity>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState("");
  const form = usePaymenntCustomerForm();

  // Fetch event data
  // TODO: Mock Event
  const mockEvent: EventWithTicketTypes = {
    eventID: "evt_001",
    organizerID: "org_001",
    organizerName: "LiveNation",
    eventTitle: "Summer Music Festival 2024",
    eventDesc: "The biggest music festival of the summer featuring top artists",
    thumbnails: [
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1000&h=400",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1429514513361-8fa32282fd5f?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
    category: [
      { id: "music", name: "Music" },
      { id: "festival", name: "Festival" },
    ],
    participantCount: 128,
    location: "Madison Square Garden, New York",
    startTime: Timestamp.fromDate(new Date("2024-07-15T19:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2024-07-15T23:00:00Z")),
    ticketTypes: [
      {
        typeID: "tt1",
        name: "General Admission",
        description: "Access to the main area of the event.",
        price: 50,
        serviceFee: 5,
        remaining: 100,
      },
      {
        typeID: "tt2",
        name: "VIP Pass",
        description: "Includes VIP lounge access and priority seating.",
        price: 150,
        serviceFee: 10,
        remaining: 20,
      },
    ],
    status: "UPCOMING", // 👈 khớp với enum EVENT_STATUS
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
    participants: [],
  };
  const { data: event, isLoading: eventLoading } =
    useQuery<EventWithTicketTypes>({
      queryKey: ["/api/events/1"],
      queryFn: () => Promise.resolve(mockEvent),
      // queryFn: () => fetchEventById<EventWithTicketTypes>("1"),
    });
  // TODO: End Mock

  // Promo code validation mutation
  const promoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/promo-codes/validate", {
        code,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPromoDiscount(data.discount);
      setPromoMessage(`Promo code applied! $${data.discount} discount.`);
    },
    onError: () => {
      setPromoDiscount(0);
      setPromoMessage("Invalid promo code.");
    },
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (data: PaymentCustomerFormInfo) => {
      const items = Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([ticketTypeId, quantity]) => ({
          ticketTypeId: ticketTypeId,
          quantity,
        }));

      const response = await Promise.resolve({ data: { purchaseId: "1" } });
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase Successful!",
        description: "You have successfully purchased your tickets!",
        duration: 3000,
      });

      setTimeout(() => {
        setLocation(`/payment/${data.purchaseId}/success`);
      }, REDIRECT_TIME);
    },
    onError: (error: any) => {
      const purchaseId = error?.response?.data?.purchaseId;
      if (purchaseId) {
        setLocation(`/payment/${purchaseId}/failed`);
      } else {
        toast({
          title: "Payment Failed",
          description: "Something went wrong. Please try again later.",
          variant: "destructive",
        });
      }
    },
  });

  const updateQuantity = (ticketTypeId: string, change: number) => {
    setQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(
        0,
        Math.min(8, (prev[ticketTypeId] || 0) + change)
      ),
    }));
  };

  const applyPromoCode = () => {
    if (!promoCode.trim()) {
      setPromoMessage("Please enter a promo code.");
      return;
    }
    promoMutation.mutate(promoCode.trim());
  };

  const { subtotal, serviceFees, total } = PaymentHelper.calculateTotals(
    event,
    quantities,
    promoDiscount
  );
  const totalTickets = PaymentHelper.totalTickets(quantities);
  const hasSelectedTickets = totalTickets > 0;

  const onSubmit = (data: PaymentCustomerFormInfo) => {
    if (!hasSelectedTickets) {
      toast({
        title: "No Tickets Selected",
        description: "Please select at least one ticket before proceeding.",
        variant: "destructive",
      });
      return;
    }
    purchaseMutation.mutate(data);
  };

  const onTimerExpired = () => {
    toast({
      title: "Time Expired",
      description: "Your ticket hold has expired. Please start over.",
      variant: "destructive",
    });
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <EventNotFound
        onGoBack={() => {}}
        onGoHome={() => {}}
        onRetry={() => {}}
      />
    );
  }

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="flex items-center">
                <div className="progress-step-active w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-primary">
                  Select Tickets
                </span>
              </div>
              <div className="progress-line-active w-16 h-0.5"></div>
              <div className="flex items-center">
                <div className="progress-step-active w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-primary">
                  Enter Details
                </span>
              </div>
              <div className="progress-line-inactive w-16 h-0.5"></div>
              <div className="flex items-center">
                <div className="progress-step-inactive w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-600">
                  Payment
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Event Details & Ticket Selection */}
            <div className="lg:col-span-3 space-y-6">
              {/* Event Info Card */}
              <Card className="overflow-hidden">
                <EventThumbnail
                  eventName={event.eventTitle}
                  eventDesc={event.eventDesc}
                  thumbnails={event.thumbnails}
                  onEventClick={() => {}}
                />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {event.eventTitle}
                      </h1>
                      <div className="flex items-center text-gray-600 mb-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>{formatDate(event.startTime.toDate())}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <CountdownTimer onExpired={onTimerExpired} />
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Selection */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Tickets
                  </h3>
                  <div className="space-y-4">
                    {event.ticketTypes.map(
                      (ticketType: MinimizedTicketType) => (
                        <div key={ticketType.typeID} className="ticket-card">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {ticketType.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {ticketType.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {formatCurrency(ticketType.price)}
                              </div>
                              <div className="text-xs text-gray-500">
                                + {formatCurrency(ticketType.serviceFee)}{" "}
                                service fee
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="outline"
                                size="icon"
                                className="group hover:bg-primary"
                                onClick={() =>
                                  updateQuantity(ticketType.typeID, -1)
                                }
                              >
                                <Minus className="h-3 w-3 text-black transition-colors duration-200 group-hover:text-white" />
                              </Button>

                              <span className="w-8 text-center font-medium">
                                {quantities[ticketType.typeID] || 0}
                              </span>

                              <Button
                                variant="outline"
                                size="icon"
                                className="group hover:bg-primary"
                                onClick={() =>
                                  updateQuantity(ticketType.typeID, 1)
                                }
                              >
                                <Plus className="h-3 w-3 text-black transition-colors duration-200 group-hover:text-white" />
                              </Button>
                            </div>
                            <div className="text-sm text-gray-500">
                              {ticketType.remaining} remaining
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Promo Code */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Promo Code
                  </h3>
                  <div className="flex space-x-3">
                    <Input
                      type="text"
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={applyPromoCode}
                      disabled={promoMutation.isPending}
                      className="text-white bg-secondary hover:bg-secondary/90"
                    >
                      Apply
                    </Button>
                  </div>
                  {promoMessage && (
                    <div
                      className={`mt-2 text-sm ${promoDiscount > 0 ? "text-primary" : "text-destructive"}`}
                    >
                      {promoMessage}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Information */}
              <PaymentCustomerInfo />
            </div>

            {/* Order Summary & Payment */}
            <div className="lg:col-span-2">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Order Summary
                  </h3>

                  <div className="space-y-3 mb-4">
                    {hasSelectedTickets ? (
                      Object.entries(quantities).map(
                        ([ticketTypeId, quantity]) => {
                          if (quantity === 0) return null;
                          const ticketType = event.ticketTypes.find(
                            (tt) => tt.typeID === ticketTypeId
                          );
                          if (!ticketType) return null;

                          return (
                            <div
                              key={ticketTypeId}
                              className="flex justify-between"
                            >
                              <span className="text-gray-600">
                                {ticketType.name} × {quantity}
                              </span>
                              <span className="text-gray-900">
                                {formatCurrency(ticketType.price * quantity)}
                              </span>
                            </div>
                          );
                        }
                      )
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <CreditCard className="mx-auto h-8 w-8 mb-2" />
                        <p>No tickets selected</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Service Fees</span>
                      <span className="text-gray-900">
                        {formatCurrency(serviceFees)}
                      </span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-primary">Promo Discount</span>
                        <span className="text-primary">
                          -{formatCurrency(promoDiscount)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">
                          Total
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Payment Method
                    </h4>
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="space-y-3"
                              >
                                {/* MOMO */}
                                <label
                                  htmlFor="payment-momo"
                                  className="payment-option flex items-center p-3 rounded-md border cursor-pointer hover:bg-primary"
                                >
                                  <RadioGroupItem
                                    id="payment-momo"
                                    value="momo"
                                    className="sr-only"
                                  />
                                  <div className="mr-3 ml-1 h-4 w-4 rounded-full border border-primary bg-white relative">
                                    {field.value === "momo" && (
                                      <div className="absolute inset-1 bg-primary rounded-full" />
                                    )}
                                  </div>
                                  <Smartphone className="ml-2 mr-3 h-5 w-5 text-primary" />
                                  <span className="font-medium">
                                    MoMo Wallet
                                  </span>
                                  <span className="ml-auto text-xs bg-primary text-white px-2 py-1 rounded">
                                    Recommended
                                  </span>
                                </label>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="mb-6">
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="termsAccepted"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="text-white"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm text-gray-600">
                                I agree to the
                                <a
                                  href="#"
                                  className="text-primary hover:underline"
                                >
                                  Terms & Conditions
                                </a>
                                <span> and </span>
                                <a
                                  href="#"
                                  className="text-primary hover:underline"
                                >
                                  Privacy Policy
                                </a>
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </Form>
                  </div>

                  {/* Purchase Button */}
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={
                      !hasSelectedTickets ||
                      !form.formState.isValid ||
                      purchaseMutation.isPending
                    }
                    className="w-full bg-primary hover:bg-primary/90 text-white py-3 px-6 font-semibold transition-all duration-200"
                  >
                    {purchaseMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Confirm & Pay
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
