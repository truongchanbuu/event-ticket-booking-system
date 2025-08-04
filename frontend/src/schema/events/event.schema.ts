import { z } from "zod";
import { EventStatusEnum } from "../enums/event-status";
import { ATTENDEE_STATUS, AttendeeStatusEnum } from "../enums/attendee-status";
import { TicketPurchaseSchema } from "../booking";

export const OrganizerSchema = z.object({
  organizerID: z.string().min(1, "Organizer ID cannot be empty."),
  name: z.string().min(1, "Organizer Name cannot be empty."),
  avatar: z.string().url("Invalid avatar url.").optional(),
});

export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const LocationSchema = z.object({
  address: z.string().min(1, "Location cannot be empty."),
  coordinates: GeoPointSchema.optional(),
});

export const EventStatsSchema = z.object({
  participantCount: z.number().int().min(0).default(0),
  checkInCount: z.number().int().min(0).default(0),
  ticketSoldCount: z.number().int().min(0).default(0),
});

export const AttendeeSchema = z
  .object({
    userID: z.string().min(1),
    displayName: z.string().min(1),
    email: z.string().email("Invalid Email"),
    ticketID: z.string().min(1, "Ticket ID is required"),
    tickets: z.array(TicketPurchaseSchema),
    attendeeStatus: AttendeeStatusEnum,
    checkInTime: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) =>
      data.attendeeStatus === ATTENDEE_STATUS.CHECKED_IN
        ? data.checkInTime != null
        : true,
    {
      message: "Check-in date time must be have if attendees checked in.",
      path: ["checkInTime"],
    }
  );

export const EventSchema = z
  .object({
    eventID: z.string().optional(),
    organizer: OrganizerSchema,
    title: z
      .string()
      .min(3, "Title must be at least 3 charaters")
      .max(100, "Title cannot more than 100 charaters"),
    description: z.string().min(1, "Description cannot be empty."),
    images: z
      .array(z.string().url("Image must be a valid url."))
      .min(1, "at least một ảnh"),
    categories: z
      .array(z.string().min(1))
      .min(1, "There should be at least 1 category."),

    startTime: z.string().datetime({ message: "Invalid Date." }),
    endTime: z.string().datetime({ message: "Invalid Date." }),

    location: LocationSchema,

    status: EventStatusEnum,
    isFeatured: z.boolean().default(false),

    stats: EventStatsSchema.default({
      checkInCount: 0,
      participantCount: 0,
      ticketSoldCount: 0,
    }),

    cancelledReason: z.string().optional(),
    cancelledBy: z.string().optional(),
    cancelledAt: z.string().datetime().optional(),

    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endTime"],
  });

export type Event = z.infer<typeof EventSchema>;
export type Attendee = z.infer<typeof AttendeeSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type EventStats = z.infer<typeof EventStatsSchema>;
export type EventOrganizer = z.infer<typeof OrganizerSchema>;
