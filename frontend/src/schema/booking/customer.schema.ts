import { z } from "zod";
import { UserSchema } from "../user/user.schema";

export const CustomerSchema = UserSchema.extend({
  id: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
