import { Buyer } from "@/schema";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigitsRegex = /^\d{8,15}$/;

export function validateBuyer(b: Buyer) {
  const errors: Partial<Record<keyof Buyer, string>> = {};
  if (!b.email || !emailRegex.test(b.email))
    errors.email = "Please enter a valid email address";
  if (!b.phone || !phoneDigitsRegex.test(b.phone))
    errors.phone = "Phone number must be 8-15 digits";
  // name optional
  return errors;
}
