export function stableStringify(obj) {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return `[${obj.map((v) => stableStringify(v)).join(",")}]`;
  }

  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}
