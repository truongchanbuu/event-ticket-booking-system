import { TypeOf, z } from "zod";
import PAYMENT_METHODS from "@event_ticket_booking_system/shared/enums/payment-method.enum.js";
import { enumObjectToLiteralArray } from "../helper.js";

export const CheckoutSchema = z.object({
  userId: z.string(),
  tickets: z.array(
    z.object({
      ticketId: z.string(),
      quantity: z.number().min(1),
    })
  ),
  paymentMethod: z.enum(enumObjectToLiteralArray(PAYMENT_METHODS)),
});

export type Checkout = z.infer<typeof CheckoutSchema>;
