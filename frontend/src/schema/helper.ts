import { Timestamp } from "firebase/firestore";
import { z } from "zod";
/**
 * Convert enum-like object values to array
 * Example: { SUCCESS: "success", FAILED: "failed" } => ["success", "failed"]
 */
export function enumObjectToArray<T extends Record<string, string>>(
  obj: T
): string[] {
  return Object.values(obj);
}

/**
 * Convert enum-like object to array of key-value pairs
 * Example: { SUCCESS: "success", FAILED: "failed" } => [{ key: "SUCCESS", value: "success" }]
 */
export function enumObjectToKeyValueArray<T extends Record<string, string>>(
  obj: T
): { key: string; value: string }[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

export function enumObjectToLiteralArray<T extends Record<string, string>>(
  obj: T
) {
  return Object.values(obj) as [T[keyof T], ...T[keyof T][]]; // cast to tuple of literals
}

export const timestampSchema = z.instanceof(Timestamp);
