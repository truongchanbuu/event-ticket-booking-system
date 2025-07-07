"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  X,
  Copy,
  Download,
  Ticket,
  UserCheck,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getOrganizerEventsByIDAPI,
  getOrganizerStatsByIDAPI,
  createEventAPI,
  updateEventAPI,
  deleteEventAPI,
  publishEventAPI,
  unpublishEventAPI,
  cancelEventAPI,
  duplicateEventAPI,
  exportEventAttendeesAPI,
  getEventStatsByIDAPI,
} from "@/lib/api";
import type { EventType } from "@/schema";
import { formatDate } from "@/lib/utils";
import { EVENT_STATUS } from "@/schema/enums/event-status";
import EventFormModal from "./EventFormModal";
import TicketManagementModal from "./TicketManagementModal";
import AttendeesModal from "./AttendeesModal";
import { useAuth } from "@/app/providers/AuthProvider";

interface OrganizerEventsManagerProps {
  organizerId: string;
  user: any;
}

// EventStatsModal nội bộ
function EventStatsModal({
  open,
  onClose,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string | null;
}) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && eventId) {
      setLoading(true);
      getEventStatsByIDAPI(eventId)
        .then((res) => setStats(res.data))
        .finally(() => setLoading(false));
    } else {
      setStats(null);
    }
  }, [open, eventId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo cáo sự kiện</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : stats ? (
          <div className="space-y-2">
            <div>
              <b>Tổng số vé:</b> {stats.totalTickets}
            </div>
            <div>
              <b>Đã bán:</b> {stats.ticketsSold}
            </div>
            <div>
              <b>Đã checkin:</b> {stats.checkedIn}
            </div>
            <div>
              <b>Chưa checkin:</b> {stats.notCheckedIn}
            </div>
            <div>
              <b>Doanh thu:</b> ${stats.revenue}
            </div>
          </div>
        ) : (
          <div>Không có dữ liệu</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OrganizerEventsManager({
  organizerId,
  user,
}: OrganizerEventsManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsEventId, setStatsEventId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: firebaseUser } = useAuth();
  const ITEMS_PER_PAGE = 10;

  // Fetch events with filters
  const { data: events = [], isLoading: eventsLoading } = useQuery<EventType[]>(
    {
      queryKey: [
        `/api/organizers/${organizerId}/events`,
        search,
        statusFilter,
        sortBy,
        currentPage,
      ],
      queryFn: async () => {
        try {
          const response = await getOrganizerEventsByIDAPI(organizerId, {
            search,
            status: statusFilter !== "all" ? statusFilter : undefined,
            sort: sortBy,
            page: currentPage,
            limit: ITEMS_PER_PAGE,
          });

          return response.data || response || [];
        } catch (error) {
          console.error("Failed to fetch events:", error);
          return [];
        }
      },
      enabled: !!organizerId,
    }
  );

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: [`/api/organizers/${organizerId}/stats`],
    queryFn: async () => {
      try {
        const response = await getOrganizerStatsByIDAPI(organizerId);
        return (
          response.data ||
          response || {
            totalEvents: 0,
            publishedEvents: 0,
            totalTicketsSold: 0,
            totalRevenue: 0,
          }
        );
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        return {
          totalEvents: 0,
          publishedEvents: 0,
          totalTicketsSold: 0,
          totalRevenue: 0,
        };
      }
    },
    enabled: !!organizerId,
  });

  // Mutations
  const publishMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!firebaseUser) throw new Error("User not authenticated");
      const token = await firebaseUser.getIdToken();
      return publishEventAPI(eventId, token);
    },
    onSuccess: () => {
      toast({ title: "Event published successfully!", variant: "success" });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/events`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/stats`],
      });
    },
    onError: () => {
      toast({ title: "Failed to publish event", variant: "destructive" });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!firebaseUser) throw new Error("User not authenticated");
      const token = await firebaseUser.getIdToken();
      return unpublishEventAPI(eventId, token);
    },
    onSuccess: () => {
      toast({ title: "Event unpublished successfully!", variant: "success" });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/events`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/stats`],
      });
    },
    onError: () => {
      toast({ title: "Failed to unpublish event", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!firebaseUser) throw new Error("User not authenticated");
      const token = await firebaseUser.getIdToken();
      return cancelEventAPI(eventId, token);
    },
    onSuccess: () => {
      toast({ title: "Event cancelled successfully!", variant: "success" });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/events`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/stats`],
      });
    },
    onError: () => {
      toast({ title: "Failed to cancel event", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!firebaseUser) throw new Error("User not authenticated");
      const token = await firebaseUser.getIdToken();
      return deleteEventAPI(eventId, token);
    },
    onSuccess: () => {
      toast({ title: "Event deleted successfully!", variant: "success" });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/events`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/stats`],
      });
    },
    onError: () => {
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!firebaseUser) throw new Error("User not authenticated");
      const token = await firebaseUser.getIdToken();
      return duplicateEventAPI(eventId, token);
    },
    onSuccess: () => {
      toast({ title: "Event cloned successfully!", variant: "success" });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/events`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/organizers/${organizerId}/stats`],
      });
    },
    onError: () => {
      toast({ title: "Failed to clone event", variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!firebaseUser) throw new Error("User not authenticated");
      const token = await firebaseUser.getIdToken();
      const blob = await exportEventAttendeesAPI(eventId, token, "csv");

      // Create and download CSV file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}-attendees.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      return blob;
    },
    onSuccess: () => {
      toast({ title: "Data exported successfully!", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to export data", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      [EVENT_STATUS.DRAFT]: { variant: "secondary", label: "Draft" },
      [EVENT_STATUS.PUBLISHED]: { variant: "default", label: "Published" },
      [EVENT_STATUS.CANCELLED]: { variant: "destructive", label: "Cancelled" },
      [EVENT_STATUS.POSTPONED]: { variant: "outline", label: "Postponed" },
      [EVENT_STATUS.SOLD_OUT]: { variant: "default", label: "Sold Out" },
      [EVENT_STATUS.ONGOING]: { variant: "default", label: "Ongoing" },
      [EVENT_STATUS.ENDED]: { variant: "secondary", label: "Ended" },
      [EVENT_STATUS.ARCHIVED]: { variant: "secondary", label: "Archived" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getTotalTicketsSold = (event: EventType) => {
    return event.ticketTypes.reduce((total, ticket) => {
      // Calculate sold tickets as (maxPerPerson - remaining)
      const sold = (ticket.maxPerPerson || 1) - (ticket.remaining || 0);
      return total + Math.max(0, sold);
    }, 0);
  };

  const getTotalRevenue = (event: EventType) => {
    return event.ticketTypes.reduce((total, ticket) => {
      // Calculate sold tickets as (maxPerPerson - remaining)
      const sold = (ticket.maxPerPerson || 1) - (ticket.remaining || 0);
      return total + Math.max(0, sold) * (ticket.price || 0);
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600">
            Manage your events and track performance
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedEvent(null);
            setShowEventForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Event
        </Button>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{stats?.totalEvents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold">
                  {stats?.publishedEvents || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Ticket className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Tickets Sold</p>
                <p className="text-2xl font-bold">
                  {stats?.totalTicketsSold || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${stats?.totalRevenue || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events..."
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
                <SelectItem value={EVENT_STATUS.DRAFT}>Draft</SelectItem>
                <SelectItem value={EVENT_STATUS.PUBLISHED}>
                  Published
                </SelectItem>
                <SelectItem value={EVENT_STATUS.CANCELLED}>
                  Cancelled
                </SelectItem>
                <SelectItem value={EVENT_STATUS.ONGOING}>Ongoing</SelectItem>
                <SelectItem value={EVENT_STATUS.ENDED}>Ended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (Newest)</SelectItem>
                <SelectItem value="date_asc">Date (Oldest)</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="status_asc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Events</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No events found
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first event to get started
              </p>
              <Button
                onClick={() => {
                  setSelectedEvent(null);
                  setShowEventForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Event</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Location</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Tickets Sold</th>
                    <th className="text-left p-3 font-medium">Revenue</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.eventID}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {event.eventTitle}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {event.eventDesc}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <p className="font-medium">
                            {formatDate(event.startTime)}
                          </p>
                          <p className="text-gray-500">
                            {formatDate(event.endTime)}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      </td>
                      <td className="p-3">{getStatusBadge(event.status)}</td>
                      <td className="p-3">
                        <div className="text-sm">
                          <p className="font-medium">
                            {getTotalTicketsSold(event)}
                          </p>
                          <p className="text-gray-500">
                            {event.ticketTypes.reduce(
                              (total, ticket) =>
                                total + (ticket.maxPerPerson || 1),
                              0
                            )}{" "}
                            total
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <p className="font-medium">
                            ${getTotalRevenue(event)}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1">
                          {/* Preview */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Event Preview</DialogTitle>
                              </DialogHeader>
                              <div className="p-4">
                                <h3 className="text-xl font-bold mb-2">
                                  {event.eventTitle}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                  {event.eventDesc}
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Date:</span>{" "}
                                    {formatDate(event.startTime)}
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Location:
                                    </span>{" "}
                                    {event.location}
                                  </div>
                                  <div>
                                    <span className="font-medium">Status:</span>{" "}
                                    {event.status}
                                  </div>
                                  <div>
                                    <span className="font-medium">
                                      Tickets Sold:
                                    </span>{" "}
                                    {getTotalTicketsSold(event)}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowEventForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Manage Tickets */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowTicketModal(true);
                            }}
                          >
                            <Ticket className="h-4 w-4" />
                          </Button>

                          {/* View Attendees */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowAttendeesModal(true);
                            }}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>

                          {/* Export */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              exportMutation.mutate(event.eventID);
                            }}
                            disabled={exportMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {/* Clone */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cloneMutation.mutate(event.eventID)}
                            disabled={cloneMutation.isPending}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          {/* Publish/Unpublish */}
                          {event.status === EVENT_STATUS.DRAFT && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                publishMutation.mutate(event.eventID)
                              }
                              disabled={publishMutation.isPending}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          {event.status === EVENT_STATUS.PUBLISHED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                unpublishMutation.mutate(event.eventID)
                              }
                              disabled={unpublishMutation.isPending}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Cancel */}
                          {event.status === EVENT_STATUS.PUBLISHED && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Cancel Event
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this event?
                                    This action will notify all attendees and
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      cancelMutation.mutate(event.eventID)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Yes, Cancel Event
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Event
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this event?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    deleteMutation.mutate(event.eventID)
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Yes, Delete Event
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Báo cáo/Thống kê */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStatsEventId(event.eventID);
                              setShowStatsModal(true);
                            }}
                          >
                            <BarChart3 className="h-4 w-4" />
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

      {/* Modals */}
      <EventFormModal
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        event={selectedEvent}
        onSuccess={() => {
          setShowEventForm(false);
          setSelectedEvent(null);
          queryClient.invalidateQueries({
            queryKey: [`/api/organizers/${organizerId}/events`],
          });
          queryClient.invalidateQueries({
            queryKey: [`/api/organizers/${organizerId}/stats`],
          });
        }}
      />

      <TicketManagementModal
        open={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        event={selectedEvent}
        onSuccess={() => {
          setShowTicketModal(false);
          setSelectedEvent(null);
          queryClient.invalidateQueries({
            queryKey: [`/api/organizers/${organizerId}/events`],
          });
        }}
      />

      <AttendeesModal
        open={showAttendeesModal}
        onClose={() => setShowAttendeesModal(false)}
        event={selectedEvent}
      />

      <EventStatsModal
        open={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        eventId={statsEventId}
      />
    </div>
  );
}
