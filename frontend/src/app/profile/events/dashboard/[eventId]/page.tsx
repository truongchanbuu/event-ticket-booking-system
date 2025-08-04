"use client";

import React, { useState } from "react";
import { Users, Ticket, DollarSign, UserCheck, ArrowLeft } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { useEventDetail } from "@/hooks/use-event-detail";
import LoadingPage from "@/components/app-loading";
import StatCard from "@/components/events/stat-card";
import EmptyStateUI from "@/components/reload";
import DetailActionButtons from "@/components/events/detail-action-buttons";
import { useEventAttendees } from "@/hooks/use-event-attendees";
import AttendeeManagement from "@/components/events/AttendeesList";
import { ATTENDEE_STATUS } from "@/schema/enums/attendee-status";
import { Attendee, TICKET_STATUS } from "@/schema";
import { useEventTicketTypes } from "@/hooks/use-event-tickets";
import { TicketType } from "@/schema/tickets";
import TicketTypeList from "@/components/ticket/ticket-type-list";
import EventDetailHeader from "@/components/events/event-detail-header";

const EventManagementDashboard = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const { eventQuery, updateEvent, cancelEvent, isCancelling } =
    useEventDetail(eventId);
  const { data, isLoading, refetch } = eventQuery;

  const {
    data: ticketData,
    isLoading: isTicketTypeLoading,
    refetch: ticketRefetch,
  } = useEventTicketTypes(eventId);

  const ticketTypes = ticketData?.data ?? [];
  const canPublished = ticketTypes.length > 0;

  // Calculate statistics
  const totalRevenue = ticketTypes.reduce(
    (sum, ticket: TicketType) => sum + ticket.price * ticket.soldQuantity,
    0
  );

  const totalTicketsRemaining = ticketTypes.reduce(
    (sum, ticket: TicketType) =>
      sum + (ticket.totalQuantity - ticket.soldQuantity),
    0
  );

  const {
    data: attendeesData,
    isLoading: areAttendeesLoading,
    refetch: attendeesRefetch,
  } = useEventAttendees(eventId);

  const attendees: Attendee[] = attendeesData?.data ?? [];

  const checkedInAttendees = attendees.filter(
    (a) => a.attendeeStatus === ATTENDEE_STATUS.CHECKED_IN
  );
  const cancelledAttendees = attendees.filter((a) =>
    a.tickets.some((t) => t.status === TICKET_STATUS.CANCELLED)
  );
  const activeAttendees = attendees.filter((a) =>
    a.tickets.some(
      (t) =>
        t.status === TICKET_STATUS.ACTIVE || t.status === TICKET_STATUS.USED
    )
  );

  const [activeTab, setActiveTab] = useState("all");
  const filteredAttendees = attendees.filter((attendee) => {
    switch (activeTab) {
      case "checked-in":
        return attendee.attendeeStatus === ATTENDEE_STATUS.CHECKED_IN;
      case "cancelled":
        return attendee.tickets.some(
          (t) => t.status === TICKET_STATUS.CANCELLED
        );
      case "active":
        return attendee.tickets.some(
          (t) =>
            t.status === TICKET_STATUS.ACTIVE || t.status === TICKET_STATUS.USED
        );
      default:
        return true;
    }
  });

  // Group attendees by ticket type
  const attendeesByTicketType = ticketTypes.map((ticketType) => {
    const typeAttendees = attendees.filter((attendee) =>
      attendee.tickets.some(
        (ticket) => ticket.ticketTypeID === ticketType.ticketTypeID
      )
    );
    return {
      ...ticketType,
      attendeeCount: typeAttendees.length,
    };
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  const eventDetail = data?.data;

  if (!eventDetail) {
    return <EmptyStateUI refetch={refetch} />;
  }

  eventDetail.stats = eventDetail?.stats ?? {
    participantCount: 0,
    checkInCount: 0,
    ticketSoldCount: 0,
  };

  const handleImagesUpdate = async ({ images: urls }: { images: string[] }) => {
    await updateEvent({
      images: urls,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-10">
      <div className="mx-auto">
        <Button variant="ghost" onClick={router.back} className="mb-3">
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </Button>

        {/* Header */}
        <header className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
          <EventDetailHeader
            eventId={eventId}
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

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={Users}
            title="Total Attendees"
            value={eventDetail.stats.participantCount.toString()}
            subtitle="Registered participants"
            color="text-blue-600"
          />
          <StatCard
            icon={UserCheck}
            title="Checked In"
            value={eventDetail.stats.checkInCount.toString()}
            subtitle={`${Math.round((eventDetail.stats.checkInCount / eventDetail.stats.participantCount) * 100)}% attendance rate`}
            color="text-green-600"
          />
          <StatCard
            icon={Ticket}
            title="Tickets Sold"
            value={eventDetail.stats.ticketSoldCount.toString()}
            subtitle={`${totalTicketsRemaining} remaining`}
            color="text-purple-600"
          />
          <StatCard
            icon={DollarSign}
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            color="text-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Ticket Types */}
          <TicketTypeList
            isLoading={isTicketTypeLoading}
            attendeesByTicketType={attendeesByTicketType}
            refetch={ticketRefetch}
          />

          {/* Attendee Statistics */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Attendee Statistics
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {checkedInAttendees.length}
                  </div>
                  <div className="text-sm text-gray-600">Checked In</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {cancelledAttendees.length}
                  </div>
                  <div className="text-sm text-gray-600">Cancelled</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">By Ticket Type</h3>
                {attendeesByTicketType.map((ticket) => (
                  <div
                    key={ticket.ticketTypeID}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {ticket.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {ticket.attendeeCount} attendees
                      </span>
                      <div className="w-12 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-600 rounded-full"
                          style={{
                            width: `${(ticket.attendeeCount / attendees.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Attendee Management */}
        <AttendeeManagement
          isLoading={areAttendeesLoading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          attendees={attendees}
          activeAttendees={activeAttendees}
          cancelledAttendees={cancelledAttendees}
          checkedInAttendees={checkedInAttendees}
          filteredAttendees={filteredAttendees}
          refetch={attendeesRefetch}
        />

        {/* Footer Info */}
        <footer className="mt-6 text-center text-sm text-gray-500">
          Event created on {formatDate(eventDetail.createdAt)} • Last updated{" "}
          {formatDate(eventDetail.updatedAt)}
        </footer>
      </div>
    </div>
  );
};

export default EventManagementDashboard;
