import { z } from "zod";
import { MinimizedTicket } from "../tickets";
import { CategorySchema } from "./category.schema";
import { EventStatusEnum } from "../enums/enum-status";
import { timestampSchema } from "../helper";

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

  startTime: timestampSchema,
  endTime: timestampSchema,

  ticketTypes: z.array(MinimizedTicket),

  status: EventStatusEnum,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,

  participants: z.array(z.any()),
});

export type EventType = z.infer<typeof EventSchema>;
