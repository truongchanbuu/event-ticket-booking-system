import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  UserCheck,
  Users,
  Clock,
  Mail,
  QrCode,
  Edit3,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { ATTENDEE_STATUS } from "@/schema/enums/attendee-status";
import { Attendee, TicketType } from "@/schema";
import { useDebouncedValue } from "@/hooks/use-debounce-value";
import { useEventAttendees } from "@/hooks/use-event-attendees";
import { formatDateTime } from "@/lib/utils";
import CreateAttendeeModal from "./create-attendee-modal";

interface AttendeeManagementProps {
  eventID: string;
  eventName: string;
  endTime: string;
  ticketTypes: TicketType[];
}

const AttendeeManagement = ({
  eventID,
  eventName,
  ticketTypes,
  endTime,
}: AttendeeManagementProps) => {
  // --- STATE CHO UI & BỘ LỌC ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // Debounce các giá trị filter
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);
  const debouncedStatusFilter = useDebouncedValue(statusFilter, 500);

  // --- DERIVED STATE TỪ REACT QUERY ---
  const { attendeesQuery, createAttendee } = useEventAttendees(eventID, {
    search: debouncedSearchTerm,
    status: debouncedStatusFilter === "ALL" ? undefined : debouncedStatusFilter,
  });

  const attendees = useMemo(
    () => attendeesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [attendeesQuery.data]
  );

  // Các trạng thái này được cung cấp sẵn bởi useInfiniteQuery
  const isLoading = attendeesQuery.isLoading;
  const isFetchingNextPage = attendeesQuery.isFetchingNextPage;
  const hasNextPage = attendeesQuery.hasNextPage;

  const stats = useMemo(() => {
    const total = attendees.length;
    const checkedIn = attendees.filter(
      (a) => a.attendeeStatus === ATTENDEE_STATUS.CHECKED_IN
    ).length;
    const registered = attendees.filter(
      (a) => a.attendeeStatus === ATTENDEE_STATUS.REGISTERED
    ).length;

    return { total, checkedIn, registered };
  }, []);

  const attendeesByTicketType = ticketTypes.map((ticketType) => {
    const attendeeCount = attendees.filter(
      (attendee) => attendee.ticketTypeID === ticketType.ticketTypeID
    ).length;

    return {
      ticketTypeID: ticketType.ticketTypeID,
      name: ticketType.name,
      attendeeCount,
    };
  });

  const getStatusBadge = (status) => {
    const styles = {
      [ATTENDEE_STATUS.CHECKED_IN]:
        "bg-green-100 text-green-800 border-green-200",
      [ATTENDEE_STATUS.REGISTERED]: "bg-blue-100 text-blue-800 border-blue-200",
      [ATTENDEE_STATUS.CANCELLED]: "bg-red-100 text-red-800 border-red-200",
    };

    const icons = {
      [ATTENDEE_STATUS.CHECKED_IN]: <CheckCircle className="w-3 h-3" />,
      [ATTENDEE_STATUS.REGISTERED]: <Clock className="w-3 h-3" />,
      [ATTENDEE_STATUS.CANCELLED]: <XCircle className="w-3 h-3" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {icons[status]}
        {status.replace("_", " ")}
      </span>
    );
  };

  const isEnded = new Date(endTime) <= new Date();
  const handleStatusChange = (attendeeId: string, newStatus: string) => {
    // updateStatusMutation.mutate({ attendeeId, newStatus });
  };

  const handleCreateAttendee = async (data) => {
    try {
      await createAttendee(data);
    } catch (e) {
      console.error(`Failed to create attendee: ${e}`);
    }
  };

  return (
    <div className="bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Attendee Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage event attendees and track check-ins
            </p>
          </div>
          {/* <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Attendee
          </button> */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 my-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendee Statistics
            </h2>
          </div>
          <div className="p-6">
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
                          width: `${
                            attendees.length > 0
                              ? (ticket.attendeeCount / attendees.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {attendeesByTicketType.length === 0 && (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Attendees
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Checked In</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.checkedIn}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Registered</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.registered}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={attendeesQuery.isFetching}
              />
              {attendeesQuery.isFetching && !isFetchingNextPage && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={attendeesQuery.isFetching}
              >
                <option value="ALL">All Status</option>
                <option value={ATTENDEE_STATUS.REGISTERED}>Registered</option>
                <option value={ATTENDEE_STATUS.CHECKED_IN}>Checked In</option>
                <option value={ATTENDEE_STATUS.CANCELLED}>Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading attendees...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Attendee
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Check-in Time
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Ticket Type
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendees.map((attendee) => (
                      <tr
                        key={attendee.attendeeID}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {attendee.displayName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {attendee.displayName}
                              </p>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Mail className="w-3 h-3" />
                                {attendee.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {getStatusBadge(attendee.attendeeStatus)}
                        </td>

                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDateTime(attendee.checkInTime)}
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {attendee.ticketTypeID
                              .replace("tt_", "")
                              .toUpperCase()}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {attendee.attendeeStatus ===
                              ATTENDEE_STATUS.REGISTERED && (
                              <button
                                onClick={() =>
                                  handleStatusChange(
                                    attendee.attendeeID,
                                    ATTENDEE_STATUS.CHECKED_IN
                                  )
                                }
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Check In"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            {attendee.qrCodeUrl && (
                              <button
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="View QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedAttendee(attendee)}
                              className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {attendees.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No attendees found</p>
                  <p className="text-gray-400">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}

              {/* Load More Button */}
              {hasNextPage && (
                <div className="border-t border-gray-200 p-4">
                  <button
                    onClick={() => attendeesQuery.fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 ..."
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Load more attendees
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Pagination Info */}
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  {/* Hiển thị tổng số đã tải */}
                  <span>Showing {attendees.length} attendees</span>
                  {!hasNextPage && attendees.length > 0 && (
                    <span>All attendees loaded</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Status Update Modal */}
      {selectedAttendee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Update Status - {selectedAttendee.displayName}
            </h3>

            <div className="space-y-3">
              {Object.values(ATTENDEE_STATUS).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    handleStatusChange(selectedAttendee.attendeeID, status);
                    setSelectedAttendee(null);
                  }}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedAttendee.attendeeStatus === status
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {status.replace("_", " ")}
                    </span>
                    {getStatusBadge(status)}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedAttendee(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendee Creation Form */}
      {/* {showAddModal && !isEnded && (
        <CreateAttendeeModal
          eventID={eventID}
          eventName={eventName}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateAttendee}
          ticketTypes={ticketTypes}
        />
      )} */}
    </div>
  );
};

export default AttendeeManagement;
