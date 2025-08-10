export function buildEnvelope(type, payload, meta) {
  return {
    type,
    version: this.schemaVersion,
    payload,
    meta: {
      at: new Date().toISOString(),
      producer: this.producerName,
      ...meta,
    },
  };
}
