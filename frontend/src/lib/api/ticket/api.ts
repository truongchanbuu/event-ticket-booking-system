import { APIResponse } from "@/schema/api";
import { fetchAPI } from "../base";
import { TicketType } from "@/schema";

export interface TicketTypesResponse extends APIResponse<TicketType[]> {}

export async function getEventTicketTypes(
  eventID: string
): Promise<TicketTypesResponse> {
  return fetchAPI(`/public/tickets/${eventID}`);
}

export async function createTicketType(ticketData) {
  return fetchAPI("/public/tickets", {
    method: "POST",
    body: JSON.stringify(ticketData),
  });
}

export async function updateTicketType(ticketTypeID: string, ticketData) {
  return fetchAPI(`/public/tickets/${ticketTypeID}`, {
    method: "PUT",
    body: JSON.stringify(ticketData),
  });
}
