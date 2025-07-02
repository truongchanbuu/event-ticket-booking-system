import { z } from "zod";

import { PaymentStatusEnum } from "../enums/payment-status";
import { PurchaseItemSchema } from "./purchase-item.schema";
import { timestampSchema } from "../helper";

export const PurchaseSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  tickets: z.array(PurchaseItemSchema).min(1),
  totalPrice: z.number().nonnegative(),
  paymentStatus: PaymentStatusEnum,
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
  paymentUrl: z.string(),
  reason: z.string().optional(),
});

export type Purchase = z.infer<typeof PurchaseSchema>;
