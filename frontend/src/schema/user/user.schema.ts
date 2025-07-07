import { z } from "zod";
import {
  ORGANIZER_STATUS,
  OrganizerStatusEnum,
  RoleEnum,
  UserStatusEnum,
} from "../enums";

// Schema
export const UserSchema = z.object({
  userID: z.string(),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  phoneNumber: z.string().optional(),
  role: RoleEnum,
  photoUrl: z.string().url().optional(),
  followedOrganizers: z.array(z.string()).optional(),
  preferenceCategories: z.array(z.string()).optional(),
  notificationReferences: z.array(z.string()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable(),
  status: UserStatusEnum,
  organizerStatus: OrganizerStatusEnum,
  reportCount: z.number().min(0).default(0),
  riskScore: z.number().min(0).max(1).default(0),
});

export type User = z.infer<typeof UserSchema>;
