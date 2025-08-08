import { APIResponse } from "@/schema/api";
import { fetchAPI } from "../base";
import { PaymentMethod, UpdatePaymentMethodInput } from "@/schema";

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
