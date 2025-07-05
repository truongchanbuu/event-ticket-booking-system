import { z } from "zod";
import { RoleEnum } from "../enums/role";

export const UserSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  photoUrl: z.string().url().optional(),
  role: RoleEnum,
  name: z.string(),
});

export type User = z.infer<typeof UserSchema>;
