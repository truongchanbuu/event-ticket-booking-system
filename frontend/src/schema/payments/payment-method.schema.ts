import { z } from "zod";
import { ALLOWED_PROVIDERS, PROVIDER_TYPE_MAP } from "../enums";

const EWalletPhoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;

export const CreatePaymentMethodSchemaBase = z.object({
  provider: z.enum(ALLOWED_PROVIDERS, {
    required_error: "Provider is required.",
  }),
  displayName: z
    .string({ required_error: "Display name is required." })
    .trim()
    .min(3)
    .max(50),
  account: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CreatePaymentMethodSchema =
  CreatePaymentMethodSchemaBase.superRefine((data, ctx) => {
    const type = PROVIDER_TYPE_MAP[data.provider];
    if (
      type === "ewallet" &&
      (!data.account || !EWalletPhoneRegex.test(data.account))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "E-wallet account must be a valid Vietnamese phone number",
        path: ["account"],
      });
    }
  });

export const UpdatePaymentMethodSchema =
  CreatePaymentMethodSchemaBase.partial().superRefine((data, ctx) => {
    if (!data.provider) return;

    const type = PROVIDER_TYPE_MAP[data.provider];
    if (
      type === "ewallet" &&
      data.account &&
      !EWalletPhoneRegex.test(data.account)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "E-wallet account must be a valid Vietnamese phone number",
        path: ["account"],
      });
    }
  });

export const PaymentMethodSchema = CreatePaymentMethodSchemaBase.extend({
  paymentMethodID: z.string(),
});

export type CreatePaymentMethodInput = z.infer<
  typeof CreatePaymentMethodSchema
>;
export type UpdatePaymentMethodInput = z.infer<
  typeof UpdatePaymentMethodSchema
>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
