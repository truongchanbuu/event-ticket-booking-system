"use client";

import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Eye,
  QrCode,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Download,
  Printer,
} from "lucide-react";
import { mockEvents } from "@/schema/events/events.mock";
import { EventType } from "@/schema";
import { formatDate } from "@/lib/utils";
import ProtectedRoute from "@/components/ProtectRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Mock tickets data for each event
const mockTickets = [
  {
    id: "ticket_001",
    type: "VIP Ticket",
    quantity: 2,
    status: "active",
    purchaseDate: "2024-12-15",
    price: 150,
  },
  {
    id: "ticket_002",
    type: "Standard Ticket",
    quantity: 1,
    status: "used",
    purchaseDate: "2024-12-10",
    price: 75,
  },
  {
    id: "ticket_003",
    type: "VIP Ticket",
    quantity: 1,
    status: "expired",
    purchaseDate: "2024-11-20",
    price: 150,
  },
];

const MyEventsPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [expandedEvents, setExpandedEvents] = useState({});

  const mockedEvents = mockEvents;

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "used":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "expired":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "refunded":
        return <RefreshCw className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Active";
      case "used":
        return "Used";
      case "expired":
        return "Expired";
      case "refunded":
        return "Refunded";
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "used":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "expired":
        return "bg-red-50 text-red-700 border-red-200";
      case "refunded":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Get event status based on time
  const getEventTimeStatus = (event: EventType) => {
    const now = new Date();
    const eventStart = event.startTime?.toDate
      ? event.startTime.toDate()
      : new Date();
    const eventEnd = event.endTime?.toDate
      ? event.endTime.toDate()
      : new Date();

    const timeDiff = eventStart.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (now >= eventStart && now <= eventEnd) {
      return "ongoing";
    } else if (hoursDiff > 0) {
      return "upcoming";
    } else {
      return "past";
    }
  };

  const getEventStatusBadge = (status) => {
    switch (status) {
      case "upcoming":
        return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
      case "past":
        return "bg-gradient-to-r from-slate-400 to-slate-500 text-white";
      case "ongoing":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white";
      case "cancelled":
        return "bg-gradient-to-r from-red-600 to-red-700 text-white";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
    }
  };

  const getEventStatusText = (status) => {
    switch (status) {
      case "upcoming":
        return "Upcoming";
      case "past":
        return "Past Event";
      case "ongoing":
        return "Live Now";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const filterEvents = (events: EventType[], filter: string) => {
    switch (filter) {
      case "upcoming":
        return events.filter(
          (event) => getEventTimeStatus(event) === "upcoming"
        );
      case "past":
        return events.filter((event) => getEventTimeStatus(event) === "past");
      case "ongoing":
        return events.filter(
          (event) => getEventTimeStatus(event) === "ongoing"
        );
      default:
        return events;
    }
  };

  const toggleEventExpansion = (eventId) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const handleDownloadTickets = (eventId) => {
    // TODO: Implement download tickets functionality
    console.log(`Downloading tickets for event: ${eventId}`);
  };

  const handlePrintTickets = (eventId) => {
    // TODO: Implement print tickets functionality
    console.log(`Printing tickets for event: ${eventId}`);
  };

  const filteredEvents = filterEvents(mockedEvents, activeTab);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                My Tickets & Events
              </h1>
              <p className="text-slate-600 mb-6">
                Manage your purchased tickets and upcoming events
              </p>

              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-slate-100/70 p-1 rounded-2xl max-w-md">
                {[
                  { key: "all", label: "All Tickets" },
                  { key: "upcoming", label: "Upcoming" },
                  { key: "ongoing", label: "Ongoing" },
                  { key: "past", label: "Past" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.key
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event) => {
              const eventTimeStatus = getEventTimeStatus(event);
              const eventDate = event.startTime?.toDate
                ? event.startTime.toDate()
                : new Date();
              const formattedDate = formatDate(eventDate);
              const formattedTime = eventDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <Card
                  key={event.eventID}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Event Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={
                        event.thumbnails?.[0] ||
                        "https://source.unsplash.com/random/800x600?event"
                      }
                      alt={event.eventTitle}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    {/* Event Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${getEventStatusBadge(eventTimeStatus)}`}
                      >
                        {getEventStatusText(eventTimeStatus)}
                      </span>
                    </div>
                  </div>

                  {/* Event Details */}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {event.eventTitle}
                    </h3>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">{formattedDate}</span>
                          <span className="text-sm font-medium">
                            {formattedTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                    </div>

                    {/* Tickets Section */}
                    <div className="border-t border-slate-200/50 pt-4">
                      <button
                        onClick={() => toggleEventExpansion(event.eventID)}
                        className="w-full flex items-center justify-between py-2 hover:bg-slate-50/50 rounded-lg transition-colors duration-200"
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {mockTickets.length} Ticket
                          {mockTickets.length !== 1 ? "s" : ""} Purchased
                        </span>
                        {expandedEvents[event.eventID] ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      {expandedEvents[event.eventID] && (
                        <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                          {mockTickets.map((ticket) => (
                            <div
                              key={ticket.id}
                              className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <QrCode className="w-5 h-5 text-slate-400" />
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {ticket.type}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    Qty: {ticket.quantity} • ${ticket.price}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Purchased: {ticket.purchaseDate}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}
                              >
                                {getStatusIcon(ticket.status)}
                                {getStatusText(ticket.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-slate-200/50 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 flex items-center gap-2"
                        onClick={() => handleDownloadTickets(event.eventID)}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 flex items-center gap-2"
                        onClick={() => handlePrintTickets(event.eventID)}
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 max-w-md mx-auto">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No tickets found
                </h3>
                <p className="text-slate-600">
                  {activeTab === "upcoming" &&
                    "You don't have any upcoming event tickets."}
                  {activeTab === "ongoing" &&
                    "You don't have any ongoing event tickets."}
                  {activeTab === "past" &&
                    "You don't have any past event tickets."}
                  {activeTab === "all" &&
                    "You haven't purchased any tickets yet."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default MyEventsPage;
