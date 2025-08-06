"use client";

import React, { useState } from "react";
import {
  Users,
  Ticket,
  DollarSign,
  UserCheck,
  ArrowLeft,
  Star,
  Crown,
  Plus,
  UserPlus,
  Loader2,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { useEventDetail } from "@/hooks/use-event-detail";
import LoadingPage from "@/components/app-loading";
import StatCard from "@/components/events/stat-card";
import EmptyStateUI from "@/components/reload";
import DetailActionButtons from "@/components/events/detail-action-buttons";
import AttendeeManagement from "@/components/events/AttendeesList";
import { EventContributor, TICKET_STATUS } from "@/schema";
import { useEventTicketTypes } from "@/hooks/use-event-tickets";
import { TicketType } from "@/schema/tickets";
import EventDetailHeader from "@/components/events/event-detail-header";
import { ContributorCard } from "@/components/events/contributor";
import { ContributorModal } from "@/components/events/contributor-modal";
import { EVENT_STATUS } from "@/schema/enums/event-status";
import TicketManagement from "@/components/ticket/ticket-management";
import LoadingSpinner from "@/components/ui/loading";

const EventManagementDashboard = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const { eventQuery, updateEvent, cancelEvent, isCancelling } =
    useEventDetail(eventId);
  const { data, isLoading, refetch } = eventQuery;

  const {
    ticketTypesQuery: ticketQuery,
    createTicketType,
    isCreating: isTicketCreating,
    updateTicketType,
    isUpdating: isTicketUpdating,
  } = useEventTicketTypes(eventId);

  const ticketTypes = ticketQuery.data?.data ?? [];
  const canPublished = ticketTypes.length > 0;

  // Calculate statistics
  const totalRevenue = ticketTypes.reduce(
    (sum, ticket: TicketType) =>
      sum +
      ticket.price *
        ((ticket.totalQuantity ?? 0) - (ticket.remainingQuantity ?? 0)),
    0
  );
  // Contributors state management
  const [showAddContributor, setShowAddContributor] = useState(false);
  const [editingContributor, setEditingContributor] =
    useState<EventContributor | null>(null);

  if (isLoading) {
    return <LoadingPage />;
  }

  const eventDetail = data?.data;

  if (!eventDetail) {
    return <EmptyStateUI refetch={refetch} />;
  }

  eventDetail.stats = {
    totalTickets: eventDetail.stats.totalTickets ?? 0,
    participantCount: eventDetail.stats.participantCount ?? 0,
    checkInCount: eventDetail.stats.checkInCount ?? 0,
    ticketSoldCount: eventDetail.stats.ticketSoldCount ?? 0,
  };

  const isTicketMutating = isTicketCreating || isTicketUpdating;
  const handleCreateTicketType = async (data) => {
    try {
      const dataToSubmit = { ...data, eventID: eventId };
      await createTicketType(dataToSubmit);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTicketType = async (ticketTypeID, data) => {
    try {
      const dataToSubmit = { ...data, eventID: eventId };
      await updateTicketType({
        ticketTypeID: ticketTypeID,
        ticketType: dataToSubmit,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-10 pb-10">
      <div className="mx-auto">
        <Button variant="ghost" onClick={router.back} className="mb-3">
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </Button>

        {/* Header */}
        <header className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
          <EventDetailHeader
            eventDetail={eventDetail}
            images={eventDetail.images}
            updateEvent={updateEvent}
          />
        </header>

        {/* Action Buttons */}
        <DetailActionButtons
          updateEvent={updateEvent}
          cancelEvent={cancelEvent}
          isCancelling={isCancelling}
          event={eventDetail}
          canPublished={canPublished}
        />

        {/* Statistics Overview - IMPROVED: Better responsive design and layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 mb-6">
          <StatCard
            icon={Users}
            title="Total Attendees"
            value={eventDetail.stats.participantCount.toString()}
            subtitle="Registered participants"
            color="text-blue-600"
            className="col-span-1"
          />
          <StatCard
            icon={UserCheck}
            title="Checked In"
            value={eventDetail.stats.checkInCount.toString()}
            subtitle={
              eventDetail.stats.participantCount > 0
                ? `${Math.round((eventDetail.stats.checkInCount / eventDetail.stats.participantCount) * 100)}% attendance rate`
                : "No participants yet"
            }
            color="text-green-600"
            className="col-span-1"
          />
          <StatCard
            icon={Ticket}
            title="Tickets Sold"
            value={eventDetail.stats.ticketSoldCount.toString()}
            subtitle={`${eventDetail.stats.totalTickets - eventDetail.stats.ticketSoldCount} remaining`}
            color="text-purple-600"
            className="col-span-1"
          />
          <StatCard
            icon={DollarSign}
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            color="text-emerald-600"
            className="col-span-1 sm:col-span-2 lg:col-span-1"
          />
          <StatCard
            icon={Star}
            title="Contributors"
            value={eventDetail.eventContributors?.length?.toString() || "0"}
            subtitle={`${eventDetail.eventContributors?.filter((c) => c.isHeadliner)?.length || 0} headliners`}
            color="text-orange-600"
            className="col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-1"
          />
        </div>

        {/* Contributors Section  */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Star className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Event Contributors
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage speakers, hosts, and other event contributors
                  </p>
                </div>
              </div>
              {eventDetail.status !== EVENT_STATUS.PUBLISHED && (
                <Button
                  onClick={() => setShowAddContributor(true)}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all duration-200 hover:shadow-md"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Contributor</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>

          <div className="p-6">
            {eventDetail.eventContributors &&
            eventDetail.eventContributors.length > 0 ? (
              <div className="space-y-8">
                {/* Headliners Section */}
                {eventDetail.eventContributors.filter((c) => c.isHeadliner)
                  .length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-yellow-100 rounded-lg">
                        <Crown className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Headliners
                        </h3>
                        <p className="text-sm text-gray-500">
                          Featured speakers and main attractions
                        </p>
                      </div>
                    </div>

                    {/* Responsive grid for headliners - larger cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                      {eventDetail.eventContributors
                        .filter((contributor) => contributor.isHeadliner)
                        .map((contributor) => (
                          <ContributorCard
                            eventID={eventDetail.eventID!}
                            eventStatus={eventDetail.status}
                            key={contributor.contributorID}
                            contributor={contributor}
                            isHeadliner={true}
                            className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Divider between sections */}
                {eventDetail.eventContributors.filter((c) => c.isHeadliner)
                  .length > 0 &&
                  eventDetail.eventContributors.filter((c) => !c.isHeadliner)
                    .length > 0 && (
                    <div className="border-t border-gray-100"></div>
                  )}

                {/* Other Contributors Section */}
                {eventDetail.eventContributors.filter((c) => !c.isHeadliner)
                  .length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-gray-100 rounded-lg">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Other Contributors
                        </h3>
                        <p className="text-sm text-gray-500">
                          Supporting team members and eventContributors
                        </p>
                      </div>
                    </div>

                    {/* Responsive grid for other eventContributors - more compact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                      {eventDetail.eventContributors
                        .filter((contributor) => !contributor.isHeadliner)
                        .map((contributor) => (
                          <ContributorCard
                            eventID={eventDetail.eventID!}
                            eventStatus={eventDetail.status}
                            key={contributor.contributorID}
                            contributor={contributor}
                            isHeadliner={false}
                            className="transform transition-all duration-200 hover:scale-105 hover:shadow-md"
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State - Modern design */
              <div className="text-center py-16">
                <div className="relative">
                  {/* Background decoration */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <div className="w-32 h-32 bg-orange-600 rounded-full"></div>
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <div className="inline-flex p-4 bg-orange-50 rounded-2xl mb-6">
                      <UserPlus className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      No Contributors Yet
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                      Start building your event team by adding speakers, hosts,
                      artists, and other contributors who will make your event
                      amazing.
                    </p>
                    <Button
                      onClick={() => setShowAddContributor(true)}
                      className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md transform hover:scale-105"
                    >
                      <Plus className="w-5 h-5" />
                      Add First Contributor
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Management */}
        {ticketQuery.isLoading ? (
          <LoadingSpinner />
        ) : (
          <TicketManagement
            isLoading={isTicketMutating}
            tickets={ticketTypes}
            error={ticketQuery.error?.message}
            onCreate={handleCreateTicketType}
            onDelete={async () => {}}
            onUpdate={handleUpdateTicketType}
          />
        )}

        {/* Attendee Management */}
        <AttendeeManagement
          eventID={eventId}
          eventName={eventDetail.title}
          endTime={eventDetail.endTime}
          ticketTypes={ticketTypes}
        />

        {/* Footer Info */}
        <footer className="mt-6 text-center text-sm text-gray-500">
          Event created on {formatDate(eventDetail.createdAt)} • Last updated{" "}
          {formatDate(eventDetail.updatedAt)}
        </footer>
      </div>

      {/* Add/Edit Contributor Modal */}
      {showAddContributor && (
        <ContributorModal
          eventID={eventId}
          isOpen={showAddContributor}
          contributor={editingContributor!}
          onClose={() => {
            setShowAddContributor(false);
            setEditingContributor(null);
          }}
        />
      )}
    </div>
  );
};

export default EventManagementDashboard;
