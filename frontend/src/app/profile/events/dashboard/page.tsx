"use client";

import React, { useState } from "react";
import { Plus, Search, Calendar, Users, Eye, TrendingUp } from "lucide-react";
import { useProfileEvents } from "@/hooks/use-profile-events";
import { useUserProfile } from "@/hooks/user-store-hooks";
import LoadingPage from "@/components/app-loading";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import EventCreationModal from "@/components/events/EventCreationModal";
import { CreateEventFormValues } from "@/schema/events/event-creation.schema";
import { Event } from "@/schema";
import EventCard from "@/components/events/event-card";
import { EVENT_STATUS } from "@/schema/enums/event-status";
import { toUpperCaseFirstLetter } from "@/lib/helpers/string.helper";

const MAX_PER_PAGE = 10;

const EventManagementDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const userProfile = useUserProfile();

  if (!userProfile) {
    return <div>There is something wrong please login and try again</div>;
  }

  const { eventsQuery, createEvent, isCreating } = useProfileEvents(
    userProfile.userID
  );

  const { isLoading, isFetching, isError, data: eventsData } = eventsQuery;

  if (isLoading || isFetching) {
    return <LoadingPage />;
  }

  if (isError) {
    toast({ variant: "destructive", title: "Failed to load data" });
  }

  const events: Event[] =
    eventsData?.data.map((e) => ({
      ...e,
      stats: e.stats ?? {
        participantCount: 0,
        checkInCount: 0,
        ticketSoldCount: 0,
      },
    })) ?? [];

  const handleCreateEvent = async (data: CreateEventFormValues) => {
    try {
      await createEvent(data);
    } catch (e) {
      toast({ variant: "destructive", title: "failed to create event." });
      console.error(`Failed to create event: ${e}`);
    }
  };

  console.log(JSON.stringify(events));

  // TODO: Kiểm tra payment methods cho lần đầu tiên tạo => FETCH API gọi lấy payment methods

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || event.categories.includes(categoryFilter);
    const matchesLocation = event.location.address
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesSearch && matchesStatus && matchesCategory && matchesLocation;
  });

  const allCategories = [
    ...new Set(events.flatMap((event) => event.categories)),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Event Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage and organize your events
              </p>
            </div>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Event
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Participants
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {events
                    .reduce(
                      (sum, event) => sum + (event.stats.participantCount || 0),
                      0
                    )
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Tickets Sold
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {events
                    .reduce(
                      (sum, event) => sum + event.stats.ticketSoldCount,
                      0
                    )
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Eye className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Published Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    events.filter((event) => event.status === "published")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search events..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {Object.values(EVENT_STATUS).map((status) => (
                  <option key={status} value={status}>
                    {toUpperCaseFirstLetter(status)}
                  </option>
                ))}
              </select>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {allCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard event={event} />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No events found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      <EventCreationModal
        isOpen={createModalOpen}
        isCreating={isCreating}
        onSubmit={handleCreateEvent}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
};

export default EventManagementDashboard;

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  published: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};
