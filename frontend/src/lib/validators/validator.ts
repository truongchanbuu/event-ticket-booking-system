import { z } from "zod"

<<<<<<< HEAD
import DateUtils from "../date.utils"

=======
>>>>>>> bbcf576 (feat(ui): auth ui & firebase auth implementation)
// Login Schema
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
})

// Register Schema
export const registerSchema = z
  .object({
<<<<<<< HEAD
    username: z
=======
    name: z
>>>>>>> bbcf576 (feat(ui): auth ui & firebase auth implementation)
      .string()
      .min(1, "Username is required")
      .min(2, "Username must be at least 2 characters")
      .max(50, "Username must be less than 50 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    terms: z
      .boolean()
      .refine(
        (val) => val === true,
        "You must accept the terms and conditions"
      ),
<<<<<<< HEAD
    dob: z
      .date({
        invalid_type_error: "Invalid date format.",
      })
      .min(new Date(DateUtils.minAvailableDate), {
        message: "Invalid date of birth.",
      })
      .max(DateUtils.maxAvailableDate, { message: "Invalid date of birth." })
      .optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    phone: z
      .string()
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          val === "" ||
          (/^\d+$/.test(val) && val.length >= 10 && val.length <= 15),
        {
          message: "Phone number must be 10-15 digits and contain only digits.",
        }
      ),
=======
>>>>>>> bbcf576 (feat(ui): auth ui & firebase auth implementation)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password doesn't match",
    path: ["confirmPassword"],
  })

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
})

// Reset Password Schema
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    token: z.string().min(1, "Reset token is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// Type inference từ schema
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
