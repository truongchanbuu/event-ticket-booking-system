import { TypeOf, z } from "zod";
import PAYMENT_METHODS from "@event_ticket_booking_system/shared/enums/payment-method.enum.js";
import { PaymentMethodEnum } from "../enums";

export const CheckoutSchema = z.object({
  userId: z.string(),
  tickets: z.array(
    z.object({
      ticketId: z.string(),
      quantity: z.number().min(1),
    })
  ),
  paymentMethod: PaymentMethodEnum,
});

export type Checkout = z.infer<typeof CheckoutSchema>;
