// import { z } from "zod";
// import { differenceInYears, isValid, parseISO } from "date-fns";
// import { PaymentMethodEnum } from "../enums/payment-method";

// const paymentCustomerFormSchema = z.object({
//   fullName: z.string().min(2, "Full name is required"),
//   email: z.string().email("Invalid email address"),
//   phone: z
//     .string()
//     .min(1, "Phone number is required")
//     .regex(/^(\+84|0)(3|5|7|8|9)\d{8}$/, "Invalid phone number format"),

//   dateOfBirth: z.string().refine(
//     (value) => {
//       const date = parseISO(value);
//       if (!isValid(date)) return false;

//       const age = differenceInYears(new Date(), date);
//       return age >= 16 && age < 100;
//     },
//     {
//       message: "You must be 16 - 100 years old",
//     }
//   ),
//   paymentMethod: PaymentMethodEnum,
//   termsAccepted: z
//     .boolean()
//     .refine((val) => val === true, "You must accept the terms and conditions"),
// });

// export type PaymentCustomerFormInfo = z.infer<typeof paymentCustomerFormSchema>;
// export default paymentCustomerFormSchema;
