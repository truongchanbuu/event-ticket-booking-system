import { z } from "zod";
import {
  EventStatsSchema,
  LocationSchema,
  OrganizerSchema,
} from "./event.schema";
import { EventStatusEnum } from "../enums/event-status";

export const UpdateEventSchema = z
  .object({
    organizer: OrganizerSchema.optional(),

    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title cannot be more than 100 characters")
      .optional(),

    description: z.string().min(1, "Description cannot be empty").optional(),

    images: z
      .array(z.string().url("Image must be a valid URL"))
      .min(1, "At least one image is required")
      .optional(),

    categories: z
      .array(z.string().min(1))
      .min(1, "At least one category")
      .optional(),

    startTime: z.string().datetime({ message: "Invalid Date" }).optional(),
    endTime: z.string().datetime({ message: "Invalid Date" }).optional(),

    location: LocationSchema.optional(),

    status: EventStatusEnum.optional(),
    isFeatured: z.boolean().optional(),

    stats: EventStatsSchema.optional(),
  })
  .refine(
    (data) =>
      !(data.startTime && data.endTime) ||
      new Date(data.endTime) > new Date(data.startTime),
    {
      message: "End time must be after the start time.",
      path: ["endTime"],
    }
  );

export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
