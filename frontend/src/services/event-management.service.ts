import {
  getOrganizerEventsAPI,
  createEventAPI,
  updateEventAPI,
  deleteEventAPI,
  publishEventAPI,
  unpublishEventAPI,
  cancelEventAPI,
  getEventAttendeesAPI,
  exportEventAttendeesAPI,
  getOrganizerStatsAPI,
  duplicateEventAPI,
  createTicketTypeAPI,
  updateTicketTypeAPI,
  deleteTicketTypeAPI,
  uploadEventImageAPI,
} from "@/lib/api/base";
import { getAuthToken } from "./auth.service";
import { EventType } from "@/schema";

export interface EventFormData {
  eventTitle: string;
  eventDesc: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  categories: string[];
  ticketTypes: {
    name: string;
    description: string;
    price: number;
    quantity: number;
  }[];
  thumbnails?: string[];
}

export interface EventFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AttendeeFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface OrganizerStats {
  totalEvents: number;
  publishedEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  upcomingEvents: number;
  pastEvents: number;
}

export class EventManagementService {
  static async getOrganizerEvents(filters?: EventFilters) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await getOrganizerEventsAPI(token, filters);
  }

  static async createEvent(eventData: EventFormData) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    // Transform form data to API format
    const apiEventData = {
      eventTitle: eventData.eventTitle,
      eventDesc: eventData.eventDesc,
      location: eventData.location,
      startTime: new Date(
        `${eventData.startDate}T${eventData.startTime}`
      ).toISOString(),
      endTime: new Date(
        `${eventData.endDate}T${eventData.endTime}`
      ).toISOString(),
      categories: eventData.categories,
      ticketTypes: eventData.ticketTypes.map((ticket, index) => ({
        name: ticket.name,
        description: ticket.description,
        price: ticket.price,
        quantity: ticket.quantity,
        maxPerPerson: 10,
      })),
      thumbnails: eventData.thumbnails || [],
    };

    return await createEventAPI(apiEventData, token);
  }

  static async updateEvent(eventId: string, eventData: EventFormData) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    // Transform form data to API format
    const apiEventData = {
      eventTitle: eventData.eventTitle,
      eventDesc: eventData.eventDesc,
      location: eventData.location,
      startTime: new Date(
        `${eventData.startDate}T${eventData.startTime}`
      ).toISOString(),
      endTime: new Date(
        `${eventData.endDate}T${eventData.endTime}`
      ).toISOString(),
      categories: eventData.categories,
      ticketTypes: eventData.ticketTypes.map((ticket, index) => ({
        name: ticket.name,
        description: ticket.description,
        price: ticket.price,
        quantity: ticket.quantity,
        maxPerPerson: 10,
      })),
      thumbnails: eventData.thumbnails || [],
    };

    return await updateEventAPI(eventId, apiEventData, token);
  }

  static async deleteEvent(eventId: string) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await deleteEventAPI(eventId, token);
  }

  static async publishEvent(eventId: string) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await publishEventAPI(eventId, token);
  }

  static async unpublishEvent(eventId: string) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await unpublishEventAPI(eventId, token);
  }

  static async cancelEvent(eventId: string) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await cancelEventAPI(eventId, token);
  }

  static async getEventAttendees(eventId: string, filters?: AttendeeFilters) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await getEventAttendeesAPI(eventId, token, filters);
  }

  static async exportEventAttendees(
    eventId: string,
    format: "csv" | "excel" = "csv"
  ) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await exportEventAttendeesAPI(eventId, token, format);
  }

  static async getOrganizerStats(): Promise<OrganizerStats> {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await getOrganizerStatsAPI(token);
  }

  static async duplicateEvent(eventId: string) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await duplicateEventAPI(eventId, token);
  }

  static async createTicketType(
    eventId: string,
    ticketData: {
      name: string;
      description: string;
      price: number;
      quantity: number;
      maxPerPerson?: number;
    }
  ) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await createTicketTypeAPI(eventId, ticketData, token);
  }

  static async updateTicketType(
    eventId: string,
    ticketId: string,
    ticketData: {
      name: string;
      description: string;
      price: number;
      quantity: number;
      maxPerPerson?: number;
    }
  ) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await updateTicketTypeAPI(eventId, ticketId, ticketData, token);
  }

  static async deleteTicketType(eventId: string, ticketId: string) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await deleteTicketTypeAPI(eventId, ticketId, token);
  }

  static async uploadEventImage(imageFile: File) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await uploadEventImageAPI(imageFile, token);
  }

  // Helper methods for data transformation
  static transformEventToFormData(event: EventType): EventFormData {
    return {
      eventTitle: event.eventTitle,
      eventDesc: event.eventDesc,
      location: event.location,
      startDate: event.startTime.toDate().toISOString().split("T")[0],
      startTime: event.startTime.toDate().toTimeString().slice(0, 5),
      endDate: event.endTime.toDate().toISOString().split("T")[0],
      endTime: event.endTime.toDate().toTimeString().slice(0, 5),
      categories: event.categories.map((cat) => cat.id),
      ticketTypes: event.ticketTypes.map((ticket) => ({
        name: ticket.name,
        description: ticket.description,
        price: ticket.price,
        quantity: ticket.remaining + (ticket.sold || 0),
      })),
      thumbnails: event.thumbnails,
    };
  }

  static calculateEventRevenue(event: EventType): number {
    return event.ticketTypes.reduce((sum, ticket) => {
      return sum + (ticket.sold || 0) * ticket.price;
    }, 0);
  }

  static calculateTotalTicketsSold(event: EventType): number {
    return event.ticketTypes.reduce((sum, ticket) => {
      return sum + (ticket.sold || 0);
    }, 0);
  }

  static getEventStatusBadge(status: string) {
    const statusConfig = {
      published: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: "CheckCircle",
      },
      unpublished: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: "EyeOff",
      },
      canceled: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: "XCircle",
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.unpublished
    );
  }
}
