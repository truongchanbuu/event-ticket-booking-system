const USE_RAW_UPSTASH_OBJECT = true; // set false to force JSON manual mode

export function serialize(value) {
  if (USE_RAW_UPSTASH_OBJECT) return value; // Upstash will serialize natively
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return String(value);
  }
}

export function deserialize(value) {
  if (USE_RAW_UPSTASH_OBJECT) return value; // Upstash auto-parsed JSON when set object
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return value; // fallback raw
  }
}
