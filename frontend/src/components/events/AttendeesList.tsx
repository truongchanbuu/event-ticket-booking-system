"use client";

import { Button } from "@/components/ui/button";
import { TICKET_STATUS, type Attendee, type Event } from "@/schema";
import { formatDate } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";
import { ATTENDEE_STATUS } from "@/schema/enums/attendee-status";
import { AttendeeResponse } from "@/lib/api/events/api";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

interface AttendeeManagementProps {
  isLoading?: boolean;
  activeTab: string;
  setActiveTab: (string) => void;
  attendees: Attendee[];
  checkedInAttendees: Attendee[];
  activeAttendees: Attendee[];
  cancelledAttendees: Attendee[];
  filteredAttendees: Attendee[];
  refetch: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<AttendeeResponse, Error>>;
}

export default function AttendeeManagement({
  isLoading = false,
  activeTab,
  setActiveTab,
  attendees,
  activeAttendees,
  cancelledAttendees,
  checkedInAttendees,
  filteredAttendees,
  refetch,
}: AttendeeManagementProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Attendee Management
          </h2>
          <div className="flex space-x-2">
            {/* <Button
              type="button"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Export List
            </Button> */}
            <Button
              type="button"
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Check In All
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mt-4">
          {[
            { key: "all", label: "All Attendees", count: attendees.length },
            {
              key: "checked-in",
              label: "Checked In",
              count: checkedInAttendees.length,
            },
            {
              key: "active",
              label: "Active",
              count: activeAttendees.length,
            },
            {
              key: "cancelled",
              label: "Cancelled",
              count: cancelledAttendees.length,
            },
          ].map((tab) => (
            <Button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-secondary text-white pointer-events-none"
                  : "bg-gray-100 text-gray-700 hover:bg-secondary"
              }`}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto relative">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Attendee
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Tickets
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Check-in
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500 inline" />
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((attendee) => (
                  <tr
                    key={attendee.userID}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {attendee.displayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attendee.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {attendee.tickets.map((ticket, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <span className="text-sm text-gray-700">
                              {ticket.quantity}x {ticket.ticketTypeName}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${getTicketStatusColor(ticket.status)}`}
                            >
                              {ticket.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {attendee.tickets.some(
                        (t) => t.status === "CANCELLED"
                      ) ? (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Cancelled
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {attendee.attendeeStatus ===
                      ATTENDEE_STATUS.CHECKED_IN ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {formatDate(attendee?.checkInTime ?? undefined)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Not checked in
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        {attendee.attendeeStatus !==
                          ATTENDEE_STATUS.CHECKED_IN && (
                          <Button
                            type="button"
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Check In
                          </Button>
                        )}
                        <Button
                          type="button"
                          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {filteredAttendees.length === 0 && (
            <div className="text-center py-8 text-gray-500 flex flex-col justify-center items-center">
              No attendees found for the selected filter.
              <Button
                variant="secondary"
                onClick={async () => await refetch()}
                className="mt-5"
                type="button"
              >
                Reload
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const getTicketStatusColor = (status) => {
  switch (status) {
    case TICKET_STATUS.ACTIVE:
      return "bg-green-100 text-green-800";
    case TICKET_STATUS.USED:
      return "bg-blue-100 text-blue-800";
    case TICKET_STATUS.CANCELLED:
      return "bg-red-100 text-red-800";
    case TICKET_STATUS.EXPIRED:
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
