import { ApiResponseError } from "@/schema/api-error";
import { AppUser } from "@/schema/user";

const API_BASE_URL = "http://localhost:3000";

export async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let data: any = {};
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("Failed to parse response:", e);
  }

  if (!res.ok) {
    console.error("API error:", {
      status: res.status,
      statusText: res.statusText,
      data,
    });

    const error: ApiResponseError = {
      statusCode: data?.statusCode ?? res.status,
      errorCode: data?.errorCode ?? "UNKNOWN_ERROR",
      message: data?.message ?? res.statusText ?? "Unknown error",
      errors: data?.errors ?? [],
    };

    throw error;
  }

  return data as T;
}

// Event
export async function fetchEventById<T>(eventId: string): Promise<T> {
  return fetchAPI<T>(`/api/events/${eventId}`);
}

// User API endpoints
export async function createUserAPI(userData: AppUser): Promise<any> {
  return fetchAPI<any>("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });
}

export async function getUserProfileAPI(token: string): Promise<any> {
  return fetchAPI<any>("/api/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateUserAPI(
  userData: any,
  token: string
): Promise<any> {
  return fetchAPI<any>("/api/me", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });
}

export async function deleteUserAPI(token: string): Promise<any> {
  return fetchAPI<any>("/api/me", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Organizer Event Management API endpoints
export async function getOrganizerEventsAPI(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
): Promise<any> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.search) searchParams.append("search", params.search);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

  const queryString = searchParams.toString();
  const url = `/api/organizers/events${queryString ? `?${queryString}` : ""}`;

  return fetchAPI<any>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createEventAPI(
  eventData: any,
  token: string
): Promise<any> {
  return fetchAPI<any>("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });
}

export async function updateEventAPI(
  eventId: string,
  eventData: any,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/events/${eventId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });
}

export async function deleteEventAPI(
  eventId: string,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function publishEventAPI(
  eventId: string,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/events/${eventId}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function unpublishEventAPI(
  eventId: string,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/events/${eventId}/unpublish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function cancelEventAPI(
  eventId: string,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/events/${eventId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Attendees API endpoints
export async function getEventAttendeesAPI(
  eventId: string,
  token: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    ticketType?: string;
    sort?: string;
  }
): Promise<any> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.search) searchParams.append("search", params.search);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.ticketType) searchParams.append("ticketType", params.ticketType);
  if (params?.sort) searchParams.append("sort", params.sort);

  const queryString = searchParams.toString();
  const url = `/api/events/${eventId}/attendees${queryString ? `?${queryString}` : ""}`;

  return fetchAPI<any>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function exportEventAttendeesAPI(
  eventId: string,
  token: string,
  format: "csv" | "excel" = "csv"
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/attendees/export?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to export attendees: ${res.statusText}`);
  }

  return res.blob();
}

// Organizer Stats API
export async function getOrganizerStatsAPI(token: string): Promise<any> {
  return fetchAPI<any>("/api/organizers/stats", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Event Duplication API
export async function duplicateEventAPI(
  eventId: string,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/events/${eventId}/clone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Ticket Management API endpoints
export async function createTicketTypeAPI(
  eventId: string,
  ticketData: any,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/events/${eventId}/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(ticketData),
  });
}

export async function updateTicketTypeAPI(
  ticketId: string,
  ticketData: any,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/tickets/${ticketId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(ticketData),
  });
}

export async function deleteTicketTypeAPI(
  ticketId: string,
  token: string
): Promise<any> {
  return fetchAPI<any>(`/api/tickets/${ticketId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Image Upload API
export async function uploadEventImageAPI(
  imageFile: File,
  token: string
): Promise<any> {
  const formData = new FormData();
  formData.append("image", imageFile);

  return fetchAPI<any>("/api/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

// Categories API
export async function getCategoriesAPI(): Promise<any> {
  return fetchAPI<any>("/api/categories");
}

// Organizer Profile API
export async function getOrganizerProfileAPI(
  organizerId: string
): Promise<any> {
  return fetchAPI<any>(`/api/organizers/${organizerId}`);
}

export async function getOrganizerEventsByIDAPI(
  organizerId: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort?: string;
  }
): Promise<any> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.search) searchParams.append("search", params.search);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.sort) searchParams.append("sort", params.sort);

  const queryString = searchParams.toString();
  const url = `/api/organizers/${organizerId}/events${queryString ? `?${queryString}` : ""}`;

  return fetchAPI<any>(url);
}

export async function getOrganizerStatsByIDAPI(
  organizerId: string
): Promise<any> {
  return fetchAPI<any>(`/api/organizers/${organizerId}/stats`);
}

// Mock API: Get event stats by event ID
export async function getEventStatsByIDAPI(eventId: string) {
  // Mock data theo schema
  return {
    data: {
      eventId,
      totalTickets: 200,
      ticketsSold: 150,
      checkedIn: 120,
      notCheckedIn: 30,
      revenue: 4500,
    },
  };
}
