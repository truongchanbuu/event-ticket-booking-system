import { APIResponse } from "@/schema/api";
import { fetchAPI } from "../base";
import {
  Buyer,
  BuyerClaimPayload,
  IntentResp,
  IntentStatusResp,
  PaymentMethod,
  Provider,
  ReservationResp,
  UpdatePaymentMethodInput,
} from "@/schema";
import { randIdem } from "@/lib/payment/idem";

export interface PaymentMethodResponse extends APIResponse<PaymentMethod> {}
export interface PaymentMethodsResponse extends APIResponse<PaymentMethod[]> {}

export async function getPaymentMethods(): Promise<PaymentMethodsResponse> {
  return fetchAPI("/me/payment/methods");
}

export async function createPaymentMethod(
  data: PaymentMethod
): Promise<PaymentMethodResponse> {
  return fetchAPI("/me/payment/methods", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePaymentMethod(
  paymentMethodID,
  data: UpdatePaymentMethodInput
): Promise<PaymentMethodResponse> {
  return fetchAPI(`/me/payment/methods/${paymentMethodID}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePaymentMethod(
  paymentMethodID
): Promise<APIResponse<null>> {
  return fetchAPI(`/me/payment/methods/${paymentMethodID}`, {
    method: "DELETE",
  });
}

async function fetchJSON<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
  });

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  // Try parse JSON once for both success & error branches
  let json: any = undefined;
  try {
    json = await res.json();
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    // Rate limit info
    if (res.status === 429) {
      const retryHeader = res.headers.get("Retry-After");
      let retryAfterSec: number | undefined;
      if (retryHeader) {
        const n = Number(retryHeader);
        if (!isNaN(n)) retryAfterSec = n;
      }
      if (!retryAfterSec && typeof json?.retryAfterSec === "number") {
        retryAfterSec = json.retryAfterSec;
      }
      const err: any = new Error("RATE_LIMITED");
      err.code = 429;
      err.retryAfterSec = retryAfterSec;
      err.detail = json;
      throw err;
    }
    const e: any = new Error("HTTP_ERROR");
    e.code = res.status;
    e.detail = json;
    throw e;
  }

  // ✅ Unwrap common envelopes: { data }, { result }, { payload }, else return raw
  const payload = json?.data ?? json?.result ?? json?.payload ?? json;
  return payload as T;
}

export async function apiGetReservation(rid: string): Promise<ReservationResp> {
  return fetchJSON<ReservationResp>(
    `/api/proxy/public/reservations/${encodeURIComponent(rid)}`,
    {
      method: "GET",
    }
  );
}

export async function apiPostBuyerClaim(
  rid: string,
  buyer: Buyer
): Promise<{
  reservationId: string;
  ttlMs: number;
  claim: {
    userId: string | null;
    buyer: {
      fullName?: string | null;
      name?: string | null;
      email: string | null;
      phone: string | null;
      note?: string | null;
      extra?: any;
    };
  };
  serverTime: number;
}> {
  return fetchJSON(
    `/api/proxy/public/reservations/${encodeURIComponent(rid)}/buyer-claim`,
    {
      method: "POST",
      headers: { "Idempotency-Key": randIdem() },
      body: JSON.stringify({ buyer }),
    }
  );
}

export async function apiPostCreateIntent(params: {
  rid: string;
  buyerClaim: BuyerClaimPayload;
  provider: Provider;
  ttlMs: number;
}): Promise<IntentResp> {
  return fetchJSON<IntentResp>(`/api/proxy/public/payment/intents`, {
    method: "POST",
    headers: { "Idempotency-Key": randIdem() },
    body: JSON.stringify({
      reservationId: params.rid,
      buyerClaim: params.buyerClaim,
      provider: params.provider,
      ttlMs: params.ttlMs,
    }),
  });
}

export async function apiGetIntentByTx(
  transactionId: string
): Promise<IntentStatusResp> {
  const id = encodeURIComponent(transactionId);
  return fetchJSON<IntentStatusResp>(`/api/proxy/public/payment/${id}/status`, {
    method: "GET",
  });
}
