import { z } from "zod";
import { OrganizerStatusEnum, RoleEnum, UserStatusEnum } from "../enums";

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).optional(),
  phoneNumber: z.string().optional(),
  role: RoleEnum.optional(),
  photoUrl: z.string().url().optional(),
  followedOrganizers: z.array(z.string()).optional(),
  preferenceCategories: z.array(z.string()).optional(),
  notificationReferences: z.array(z.string()).optional(),
  status: UserStatusEnum.optional(),
  organizerStatus: OrganizerStatusEnum.optional(),
  reportCount: z.number().min(0).optional(),
  riskScore: z.number().min(0).max(1).optional(),
});

export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
