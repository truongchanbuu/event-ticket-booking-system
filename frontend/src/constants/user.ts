export const QUERY_KEYS = {
  userProfile: (uid?: string) => ["userProfile", uid] as const,
};

export const supportedCurrencies = [
  { code: "VND", label: "Đồng" },
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "GBP", label: "British Pound" },
];
