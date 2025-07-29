"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Mail,
  Phone,
  Calendar,
  Loader2,
  Users,
  Ticket,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getEventAttendeesAPI } from "@/lib/api/base";
import type { EventType } from "@/schema";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/app/providers/AuthProvider";

interface AttendeesModalProps {
  open: boolean;
  onClose: () => void;
  event: EventType | null;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ticketType: string;
  ticketPrice: number;
  purchaseDate: string;
  status: string;
}

export default function AttendeesModal({
  open,
  onClose,
  event,
}: AttendeesModalProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");

  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch attendees
  const { data: attendees = [], isLoading: attendeesLoading } = useQuery<
    Attendee[]
  >({
    queryKey: [
      `/api/events/${event?.eventID}/attendees`,
      search,
      statusFilter,
      ticketFilter,
      sortBy,
    ],
    queryFn: async () => {
      if (!event || !user) return [];

      try {
        const token = await user.getIdToken();
        const response = await getEventAttendeesAPI(event.eventID, token, {
          search,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ticketType: ticketFilter !== "all" ? ticketFilter : undefined,
          sort: sortBy,
        });

        return response.data || response || [];
      } catch (error) {
        console.error("Failed to fetch attendees:", error);
        return [];
      }
    },
    enabled: !!event && open && !!user,
  });

  // Export attendees
  const handleExport = async () => {
    // if (!event || !user) return;
    // try {
    //   const token = await user.getIdToken();
    //   const blob = await exportEventAttendeesAPI(event.eventID, token, "csv");
    //   // Create and download CSV file
    //   const url = window.URL.createObjectURL(blob);
    //   const a = document.createElement("a");
    //   a.href = url;
    //   a.download = `attendees-${event.eventID}.csv`;
    //   a.click();
    //   window.URL.revokeObjectURL(url);
    //   toast({ title: "Attendees exported successfully!", variant: "success" });
    // } catch (error) {
    //   console.error("Failed to export attendees:", error);
    //   toast({ title: "Failed to export attendees", variant: "destructive" });
    // }
  };

  // Get unique ticket types for filter
  const ticketTypes = event
    ? [
        ...new Set(
          event.ticketTypes.map((t) => t.name || t.typeID || "Unknown")
        ),
      ]
    : [];

  // Calculate statistics
  const totalAttendees = attendees.length;
  const totalRevenue = attendees.reduce(
    (sum, attendee) => sum + attendee.ticketPrice,
    0
  );
  const confirmedAttendees = attendees.filter(
    (a) => a.status === "confirmed"
  ).length;

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendees - {event.eventTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Attendees</p>
                    <p className="text-2xl font-bold">{totalAttendees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Ticket className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Confirmed</p>
                    <p className="text-2xl font-bold">{confirmedAttendees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">${totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search attendees..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={ticketFilter} onValueChange={setTicketFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by ticket type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ticket Types</SelectItem>
                    {ticketTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">
                      Purchase Date (Newest)
                    </SelectItem>
                    <SelectItem value="date_asc">
                      Purchase Date (Oldest)
                    </SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                    <SelectItem value="price_desc">Price (High-Low)</SelectItem>
                    <SelectItem value="price_asc">Price (Low-High)</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attendees List */}
          <Card>
            <CardHeader>
              <CardTitle>Attendees List ({attendees.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {attendeesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No attendees found
                  </h3>
                  <p className="text-gray-600">
                    {search || statusFilter !== "all" || ticketFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No one has purchased tickets for this event yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Attendee</th>
                        <th className="text-left p-3 font-medium">Contact</th>
                        <th className="text-left p-3 font-medium">Ticket</th>
                        <th className="text-left p-3 font-medium">
                          Purchase Date
                        </th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((attendee) => (
                        <tr
                          key={attendee.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="" />
                                <AvatarFallback>
                                  {attendee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {attendee.name}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-3 w-3 mr-1" />
                                <span>{attendee.email}</span>
                              </div>
                              {attendee.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-3 w-3 mr-1" />
                                  <span>{attendee.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {attendee.ticketType}
                              </p>
                              <p className="text-sm text-gray-600">
                                ${attendee.ticketPrice}
                              </p>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                {formatDate(new Date(attendee.purchaseDate))}
                              </span>
                            </div>
                          </td>

                          <td className="p-3">
                            <Badge
                              variant={
                                attendee.status === "confirmed"
                                  ? "default"
                                  : attendee.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {attendee.status}
                            </Badge>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm">
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
