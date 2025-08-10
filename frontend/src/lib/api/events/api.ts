import { Attendee, Event, EventContributor, EventDetail } from "@/schema";
import { fetchAPI } from "../base";
import { APIResponse, GetParams } from "@/schema/api";
import { getBaseUrl } from "@/lib/utils";

export interface EventsResponse extends APIResponse<Event[]> {}
export interface EventReponse extends APIResponse<Event> {}
export interface AttendeesResponse extends APIResponse<Attendee[]> {}
export interface CRUDAttendeeResponse extends APIResponse<Attendee> {}
export interface contributorsResponse extends APIResponse<EventContributor[]> {}

async function fetchEvents<T>(
  path: string,
  options?: RequestInit
): Promise<any> {
  return fetchAPI<T>(`${path}`, options);
}

export async function getOrganizerEvents(
  params?: GetParams
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
): Promise<EventReponse> {
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

export async function publishEventAPI(eventID) {
  return fetchEvents(`/private/events/${eventID}/publish`, {
    method: "POST",
  });
}

export async function cancelEvent(eventID: string, cancelledReason?: string) {
  return fetchEvents(`/me/events/${eventID}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancelledReason }),
  });
}

// Attendees
export async function getAttendees(
  eventID: string,
  params: GetParams
): Promise<AttendeesResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
  }

  const queryString = searchParams.toString();
  const url = `/private/events/${eventID}/attendees${queryString ? `?${queryString}` : ""}`;
  return fetchEvents<AttendeesResponse>(url);
}

export async function createAttendee(
  eventID: string,
  data
): Promise<CRUDAttendeeResponse> {
  return fetchEvents(`/me/events/${eventID}/create-attendee`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Contributors
export async function removeContributor(eventID, contributorID) {
  return fetchEvents(
    `/private/events/${eventID}/contributors/${contributorID}`,
    {
      method: "DELETE",
    }
  );
}

export async function createContributorAPI(eventID, data) {
  return fetchEvents(`/private/events/${eventID}/contributors`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateContributorAPI(eventID, contributorID, data) {
  return fetchEvents(
    `/private/events/${eventID}/contributors/${contributorID}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export type EventFetchResult =
  | { kind: "ok"; data: EventDetail }
  | { kind: "cancelled"; reason?: string }
  | { kind: "not_found" }
  | { kind: "error"; message: string };
export async function fetchEventBySlug(
  slug: string,
  init: RequestInit = {}
): Promise<EventFetchResult> {
  const url = new URL(
    `/api/events/${encodeURIComponent(slug)}`,
    getBaseUrl()
  ).toString();

  const nextOpt = (init as any).next ?? {};
  const tags: string[] = nextOpt.tags ?? [`event:slug:${slug}`];
  const revalidate: number | false = nextOpt.revalidate ?? 60;

  const res = await fetch(url, {
    ...init,
    next: { ...nextOpt, tags, revalidate },
    headers: { accept: "application/json", ...(init?.headers || {}) },
  });

  if (res.status === 410) {
    const body = await res.json().catch(() => ({}));
    return {
      kind: "cancelled",
      reason: body?.data?.cancelledReason || body?.message,
    };
  }
  if (res.status === 404) return { kind: "not_found" };

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { kind: "error", message: body || `HTTP ${res.status}` };
  }

  const result = await res.json();
  return { kind: "ok", data: result.data };
}
