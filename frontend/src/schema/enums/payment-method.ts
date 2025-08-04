import { z } from "zod";

enum PAYMENT_METHODS {
  MOMO = "momo",
  VNPAY = "vnpay",
  ZALOPAY = "zalopay",
  CREDIT_CARD = "credit_card",
  BANK_TRANSFER = "bank_transfer",
  CASH = "cash",
  PAYPAL = "paypal",
}

export const PaymentMethodEnum = z.nativeEnum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export default PAYMENT_METHODS;
