import { z } from "zod";
import { OrganizerStatusEnum } from "../enums/organizer-status";
import { UserSchema } from "./user.schema";
import { CategorySchema } from "../events/category.schema";

export const OrganizerTypeSchema = z.enum(["personal", "business"]);
export type OrganizerType = z.infer<typeof OrganizerTypeSchema>;

export const OrganizerUserSchema = UserSchema.extend({
  organizerId: z.string(),
  organizerType: OrganizerTypeSchema,
  bio: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional(),
  xUrl: z.string().url().optional(),
  organizerStatus: OrganizerStatusEnum,
  followersCount: z.number().default(0),
  eventsCount: z.number().default(0),
  categories: z.array(CategorySchema).default([]),
});

export type Organizer = z.infer<typeof OrganizerUserSchema>;
