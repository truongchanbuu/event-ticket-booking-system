import { TypeOf, z } from "zod";
import { EventStatusEnum } from "../enums/event-status";
import { ATTENDEE_STATUS, AttendeeStatusEnum } from "../enums/attendee-status";
import { TicketPurchaseSchema } from "../booking";
import { TicketTypeSchema } from "../tickets";

const START_DELAY_TIME = 1000 * 60 * 60;

export const OrganizerSchema = z.object({
  organizerID: z.string().min(1, "Organizer ID cannot be empty."),
  name: z.string().min(1, "Organizer Name cannot be empty."),
  photoUrl: z.string().url("Invalid avatar url.").optional(),
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
  totalTickets: z.number().int().min(0).default(0),
  ticketSoldCount: z.number().int().min(0).default(0),
});

export const EventContributorSchema = z.object({
  contributorID: z.string().optional(),
  fullname: z.string().min(1, "Contributor name is required."), // Denormalized for quick access
  photo: z
    .union([z.instanceof(File), z.string().url(), z.literal("")])
    .optional(),
  role: z.string().min(1, "Role is required."), // e.g., "Keynote Speaker", "Host", "Artist"
  isHeadliner: z.boolean().default(false), // QUAN TRỌNG: Dùng để xác định thay đổi lớn
  photoUrl: z.string().optional(),
});

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
      .min(1, "You must have at least."),
    categories: z
      .array(z.string().min(1))
      .min(1, "There should be at least 1 category."),
    startTime: z
      .string()
      .min(1, "It cannot be empty.")
      .refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: "Invalid Date.",
      })
      .transform((val) => new Date(val).toISOString())
      .refine(
        (val) => new Date(val).getTime() >= Date.now() + START_DELAY_TIME,
        {
          message: "Start time must be at least 1 hour from now.",
        }
      ),
    endTime: z.string().datetime({ message: "Invalid Date." }),
    location: LocationSchema,
    status: EventStatusEnum,
    ticketTypes: z.array(TicketTypeSchema),
    eventContributors: z.array(EventContributorSchema),
    isFeatured: z.boolean().default(false),
    stats: EventStatsSchema.default({
      checkInCount: 0,
      participantCount: 0,
      ticketSoldCount: 0,
      totalTickets: 0,
    }),

    cancelledReason: z.string().optional(),
    cancelledBy: z.string().optional(),
    cancelledByUsername: z.string().optional(),
    cancelledAt: z.string().datetime().optional(),

    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    publishedAt: z.string().datetime().optional(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "Start time must be before end time.",
    path: ["endTime"],
  });

export type Event = z.infer<typeof EventSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type EventStats = z.infer<typeof EventStatsSchema>;
export type EventOrganizer = z.infer<typeof OrganizerSchema>;
export type EventContributor = z.infer<typeof EventContributorSchema>;
