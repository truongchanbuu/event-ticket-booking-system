import { z } from "zod";
export enum PAYMENT_STATUS {
  SUCCESS = "success",
  FAILED = "failed",
  PENDING = "pending",
}

export const PaymentStatusEnum = z.nativeEnum(PAYMENT_STATUS);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export default PAYMENT_STATUS;
