import { Attendee, Event, TicketType } from "@/schema";
import { fetchAPI } from "../base";
import { APIResponse } from "@/schema/api";

export interface EventsResponse extends APIResponse<Event[]> {}
export interface EventReponse extends APIResponse<Event> {}
export interface AttendeeResponse extends APIResponse<Attendee[]> {}
export interface TicketTypesResponse extends APIResponse<TicketType[]> {}

export interface GetEventsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

async function fetchEvents<T>(
  path: string,
  options?: RequestInit
): Promise<any> {
  return fetchAPI<T>(`${path}`, options);
}

/**
 * GET: Lấy danh sách sự kiện của người tổ chức
 */
export async function getOrganizerEvents(
  params?: GetEventsParams
): Promise<EventsResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
  }

  const queryString = searchParams.toString();
  const url = `/me/events${queryString ? `?${queryString}` : ""}`;
  return fetchEvents<EventsResponse>(url);
}

export async function getEventByID(eventID: string): Promise<EventReponse> {
  return fetchEvents<EventReponse>(`/me/events/${eventID}`);
}

/**
 * POST: Tạo một sự kiện mới
 */
export async function createOrganizerEvent(
  eventData: Partial<Event>
): Promise<{ data: Event }> {
  return fetchEvents<{ data: Event }>("/me/events", {
    method: "POST",
    body: JSON.stringify(eventData),
  });
}

/**
 * PUT: Cập nhật một sự kiện đã có
 */
export async function updateOrganizerEvent(
  eventID: string,
  updateData: Partial<Event>
): Promise<{ data: Event }> {
  return fetchEvents<{ data: Event }>(`/me/events/${eventID}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
}

export async function cancelEvent(eventID: string, cancelledReason?: string) {
  return fetchEvents(`/me/events/${eventID}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancelledReason }),
  });
}

// Attendees
export async function getAttendees(eventID: string): Promise<AttendeeResponse> {
  return fetchEvents<AttendeeResponse>(`/public/events/${eventID}/attendees`);
}

// Ticket Type
export async function getEventTicketTypes(
  eventID: string
): Promise<TicketTypesResponse> {
  return fetchEvents<AttendeeResponse>(`/public/events/${eventID}/tickets`);
}
