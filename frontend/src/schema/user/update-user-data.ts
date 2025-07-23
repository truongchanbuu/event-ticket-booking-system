import { z } from "zod";
import { RoleEnum } from "../enums";

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).optional(),
  phoneNumber: z
    .string()
    .transform((val) => (val.trim() === "" ? undefined : val))
    .optional(),
  birthday: z.string().datetime().optional(),
  photoUrl: z.string().url().optional(),
  followedOrganizers: z.array(z.string()).optional(),
  preferenceCategories: z.array(z.string()).optional(),
});

export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
