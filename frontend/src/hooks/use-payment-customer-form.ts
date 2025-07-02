// src/components/forms/useCustomerForm.ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import paymentCustomerFormSchema, {
  PaymentCustomerFormInfo,
} from "@/schema/payments/payment-customer-form.schema";

export function usePaymenntCustomerForm() {
  return useForm<PaymentCustomerFormInfo>({
    resolver: zodResolver(paymentCustomerFormSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      paymentMethod: "momo",
      termsAccepted: false,
    },
  });
}
