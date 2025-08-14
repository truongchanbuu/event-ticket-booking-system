export function buildEnvelope({ type, version, payload, meta }) {
  return {
    type,
    version: version ?? 1,
    payload,
    meta: {
      at: new Date().toISOString(),
      producer: meta?.producerName,
      ...meta,
    },
  };
}

export function decodeEnvelope(message) {
  const raw = message?.value ? message.value.toString("utf8") : "{}";
  let env;
  try {
    env = JSON.parse(raw);
  } catch {
    env = {};
  }

  const headers = message?.headers || {};
  const typeFromHeader = headers["event-type"]?.toString();
  const verFromHeader = Number(headers["event-version"]?.toString());

  const type = env?.type || typeFromHeader || "unknown";
  const version = Number(env?.version ?? verFromHeader ?? 1);
  const meta = env?.meta || env?.enrichedMeta || {}; // fallback tương thích
  const payload = env?.payload ?? env; // nếu producer gửi raw payload

  return { type, version, meta, payload };
}

export function extractData(input) {
  // Ưu tiên payload đã decode
  if (input && input.decoded && input.decoded.payload)
    return input.decoded.payload;

  // Nếu là EachMessagePayload (KafkaJS)
  if (input && input.message && input.message.value) {
    try {
      return JSON.parse(input.message.value.toString("utf8"));
    } catch {
      return {}; // tránh throw làm rơi message
    }
  }
  // Ngược lại coi như đã là domain payload
  return input || {};
}

const _pick = (...alts) => alts.find((v) => v != null && v !== "") ?? undefined;
