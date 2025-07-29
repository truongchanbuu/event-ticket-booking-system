import { z } from "zod";
import { UserStatusEnum } from "../enums";

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).optional(),
  phoneNumber: z
    .string()
    .transform((val) => (val.trim() === "" ? undefined : val))
    .optional()
    .refine(
      (val) =>
        !val ||
        /^(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(
          val
        ),
      {
        message: "Invalid phone number.",
      }
    ),
  birthday: z
    .string()
    .transform((val) => (val.trim() === "" ? undefined : val))
    .optional()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: "Invalid date.",
    }),
  photoUrl: z
    .string()
    .transform((val) => (val.trim() === "" ? undefined : val))
    .optional(),
  followedOrganizers: z.array(z.string()).optional(),
  preferenceCategories: z.array(z.string()).optional(),
  emailVerified: z.boolean().optional(),
  status: UserStatusEnum.optional(),
});

export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
