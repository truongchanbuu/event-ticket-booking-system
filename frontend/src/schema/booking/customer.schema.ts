import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string().optional(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  dateOfBirth: z.string().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
