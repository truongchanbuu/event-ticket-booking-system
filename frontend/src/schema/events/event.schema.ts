import { z } from "zod";
import EVENT_STATUS from "@event_ticket_booking_system/shared/enums/event-status.enum";
import { MinimizedTicket } from "../tickets";
import { CategorySchema } from "./category.schema";
import { enumObjectToLiteralArray, timestampSchema } from "../helper";

// Event schema
export const EventSchema = z.object({
  eventID: z.string(),
  organizerID: z.string(),
  organizerName: z.string(),
  eventTitle: z.string(),
  eventDesc: z.string(),
  thumbnails: z.array(z.string().url()),

  category: z.array(CategorySchema),
  participantCount: z.number().int().nonnegative(),
  location: z.string(),

  startTime: timestampSchema,
  endTime: timestampSchema,

  ticketTypes: z.array(MinimizedTicket),

  status: z.enum(enumObjectToLiteralArray(EVENT_STATUS)),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,

  participants: z.array(z.any()),
});

export type EventType = z.infer<typeof EventSchema>;
