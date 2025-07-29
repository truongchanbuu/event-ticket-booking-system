import { z } from "zod";
import { TicketTypeSchema } from "../tickets";
import { CategorySchema } from "./category.schema";
import { EventStatusEnum } from "../enums/event-status";

// Event schema
export const EventSchema = z.object({
  eventID: z.string(),
  organizerID: z.string(),
  organizerName: z.string(),
  organizerPhotoUrl: z.string().optional(),

  eventTitle: z.string(),
  eventDesc: z.string(),
  thumbnails: z.array(z.string().url()),

  categories: z.array(CategorySchema),
  participantCount: z.number().int().nonnegative(),
  location: z.string(),

  startTime: z.string(),
  endTime: z.string(),

  ticketTypes: z.array(TicketTypeSchema),

  status: EventStatusEnum,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type EventType = z.infer<typeof EventSchema>;
