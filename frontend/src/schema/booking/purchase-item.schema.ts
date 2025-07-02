import { z } from "zod";

export const PurchaseItemSchema = z.object({
  purchaseId: z.string(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string(),
  serviceFee: z.number().default(0),
  quantity: z.number(),
  unitPrice: z.number(),
  qrCode: z.string(),
});

export type PurchaseItem = z.infer<typeof PurchaseItemSchema>;
