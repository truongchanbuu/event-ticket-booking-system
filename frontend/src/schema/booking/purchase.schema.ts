import { z } from "zod";

import { PaymentStatusEnum } from "../enums/payment-status";
import { PaymentMethodEnum } from "../enums/payment-method";
import { timestampSchema } from "../helper";
import { TicketSchema } from "../tickets";

export const PurchaseSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  tickets: z.array(TicketSchema).min(1),
  totalPrice: z.number().nonnegative(),
  paymentStatus: PaymentStatusEnum,
  paymentMethod: PaymentMethodEnum.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
  paymentUrl: z.string(),
  reason: z.string().optional(),
});

export type Purchase = z.infer<typeof PurchaseSchema>;
