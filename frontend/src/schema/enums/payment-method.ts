import { z } from "zod";
enum PAYMENT_METHODS {
  MOMO = "momo",
}

export const PaymentMethodEnum = z.nativeEnum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export default PAYMENT_METHODS;
