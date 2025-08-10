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

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withTimeout(fn, ms) {
  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`timeout:${ms}ms`)), ms)
  );
  return Promise.race([fn(), timeout]);
}
