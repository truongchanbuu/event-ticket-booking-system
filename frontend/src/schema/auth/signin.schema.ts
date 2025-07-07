import { z } from "zod";

// Individual field schemas for reuse
export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z.string().min(1, "Password is required");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});

export type SignInFormData = z.infer<typeof signInSchema>;
