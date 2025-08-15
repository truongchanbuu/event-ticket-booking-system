type CheckoutLine = { ttId: string; qty: number };
type CheckoutOK = { reservationId: string; expiresAt: string; ttlMs: number };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
