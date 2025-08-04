import { z } from "zod";
import { emailSchema } from "./signin.schema";
import { MIN_PASSWORD_LENGTH, MIN_USERNAME_LENGTH } from "@/constants/auth";

// Individual field schemas for reuse
export const usernameSchema = z
  .string()
  .min(
    MIN_USERNAME_LENGTH,
    `Username must be at least ${MIN_USERNAME_LENGTH} characters`
  );

export const signUpPasswordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  )
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

export const signUpFormSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: signUpPasswordSchema,
    confirmPassword: z.string(),
    phone: z.string().optional().or(z.literal("")),
    birthday: z.string().optional().or(z.literal("")),
    agreeToTerms: z.boolean().refine((val) => val, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpFormSchema>;
