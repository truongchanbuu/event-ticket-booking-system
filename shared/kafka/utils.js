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
