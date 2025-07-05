import { z } from "zod";
import { OrganizerStatusEnum } from "../enums/organizer-status";
import { UserSchema } from "./user.schema";

export const OrganizerUserSchema = UserSchema.extend({
  organizerId: z.string(),
  bio: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional(),
  xUrl: z.string().url().optional(),
  organizerStatus: OrganizerStatusEnum,
  followersCount: z.number().default(0),
  eventsCount: z.number().default(0),
});

export type Organizer = z.infer<typeof OrganizerUserSchema>;
