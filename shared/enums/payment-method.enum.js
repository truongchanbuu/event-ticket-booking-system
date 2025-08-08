export const PAYMENT_PROVIDERS = Object.freeze({
  MOMO: "momo",
  ZALO_PAY: "zalopay",
  STRIPE: "stripe",
});

export const PROVIDER_TYPE_MAP = Object.freeze({
  [PAYMENT_PROVIDERS.MOMO]: "ewallet",
  [PAYMENT_PROVIDERS.ZALO_PAY]: "ewallet",
  [PAYMENT_PROVIDERS.STRIPE]: "card",
});

const providerValues = Object.values(PAYMENT_PROVIDERS);

export const ALLOWED_PROVIDERS = providerValues;
