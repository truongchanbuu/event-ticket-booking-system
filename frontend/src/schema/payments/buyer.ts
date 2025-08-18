export type Buyer = {
  email: string;
  phone: string;
  name?: string;
  userId?: string;
};

export type ReservationResp = {
  ttlMs: number;
  serverTime: number;
  lines?: Array<{
    ttId: string;
    qty: number;
    title?: string;
  }>;
  reservationId: string;
};

export type IntentUIQr = { kind: "qr"; url: string };
export type IntentUIRedirect = { kind: "redirect"; url: string };
export type IntentUI = IntentUIQr | IntentUIRedirect;

export type IntentResp = {
  paymentIntentID: string;
  transactionId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  expiresAt?: number | string; // epoch ms or ISO
  ui: IntentUI;
};

export type IntentStatusResp = {
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  orderId?: string;
  claim?: { url: string };
  transactionId: string;
  paymentIntentID?: string;
  ui?: IntentUI;
  expiresAt?: number | string;
  message?: string;
};

export type Phase = "idle" | "minting" | "creating" | "awaiting" | "success";
export type Provider = "momo" | "zalopay" | "stripe";

export type StoredBuyer = { buyer: Buyer; expAt: number };
export type StoredTx = {
  transactionId: string;
  paymentIntentID?: string;
  provider: Provider;
  expiresAt?: number; // epoch ms
  ui?: IntentUI;
  qrPayload: string | null;
};

export type BuyerClaimPayload = {
  fullName?: string | null;
  name?: string | null;
  email: string | null;
  phone: string | null;
  note?: string | null;
  extra?: any;
  userId?: string | null;
};
