export const ALLOWED_PROVIDERS: [string, ...string[]] = ["momo"];
export type PaymentProvider = (typeof ALLOWED_PROVIDERS)[number];

export const PROVIDER_TYPE_MAP: Record<
  (typeof ALLOWED_PROVIDERS)[number],
  "ewallet"
> = {
  momo: "ewallet",
};

export const ALLOWED_TYPES = [
  ...new Set(Object.values(PROVIDER_TYPE_MAP)),
] as const;
