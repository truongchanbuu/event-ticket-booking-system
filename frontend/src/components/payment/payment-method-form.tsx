import React, { useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreatePaymentMethodSchema,
  CreatePaymentMethodInput,
  ALLOWED_PROVIDERS,
  PaymentProvider,
} from "@/schema";
import { usePaymentMethods } from "@/hooks/use-payment-method";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ChevronDown, CreditCard, Smartphone } from "lucide-react";

interface PaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const PaymentMethodForm = ({
  onSuccess,
  onCancel,
}: PaymentMethodFormProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { createMethod, isCreating } = usePaymentMethods();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<CreatePaymentMethodInput>({
    resolver: zodResolver(CreatePaymentMethodSchema),
    defaultValues: {
      provider: "momo",
      displayName: "",
      account: "",
      isDefault: true,
    },
  });

  const watchedProvider = watch("provider");

  const providerConfig: Record<
    PaymentProvider,
    { label: string; type: string; icon: React.ReactNode }
  > = {
    momo: {
      label: "MoMo",
      type: "ewallet",
      icon: <Smartphone className="w-4 h-4" />,
    },
    // zalopay: {
    //   label: "ZaloPay",
    //   type: "ewallet",
    //   icon: <Smartphone className="w-4 h-4" />,
    // },
    // vnpay: {
    //   label: "VNPay",
    //   type: "gateway",
    //   icon: <CreditCard className="w-4 h-4" />,
    // },
    // vietcombank: {
    //   label: "Vietcombank",
    //   type: "bank",
    //   icon: <Building className="w-4 h-4" />,
    // },
    // techcombank: {
    //   label: "Techcombank",
    //   type: "bank",
    //   icon: <Building className="w-4 h-4" />,
    // },
  };

  const selectedProvider = providerConfig[watchedProvider];
  const isEWallet = selectedProvider?.type === "ewallet";

  const onSubmit: SubmitHandler<CreatePaymentMethodInput> = (data) => {
    createMethod(data, {
      onSuccess: () => {
        onSuccess();
      },
    });
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Provider</Label>
          <Controller
            name="provider"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl hover:bg-gray hover:text-black transition-all duration-200 ${
                    errors.provider
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  } focus:outline-none focus:ring-4`}
                >
                  <div className="flex items-center space-x-3">
                    {selectedProvider ? (
                      <>
                        {selectedProvider.icon}
                        <span className="text-gray-900">
                          {selectedProvider.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">Select a provider</span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </Button>

                {isDropdownOpen && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                    {ALLOWED_PROVIDERS.map((provider) => {
                      const config = providerConfig[provider] || {
                        label: provider.toUpperCase(),
                        type: "unknown",
                        icon: <CreditCard className="w-4 h-4" />,
                      };
                      return (
                        <Button
                          variant="ghost"
                          key={provider}
                          type="button"
                          onClick={() => {
                            field.onChange(provider);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 bg-white hover:text-black hover:bg-gray-50 transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl text-left"
                        >
                          {config.icon}
                          <span className="text-gray-900">{config.label}</span>
                          <span className="ml-auto text-xs text-gray-400 capitalize">
                            {config.type}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          />
          {errors.provider && (
            <p className="text-sm text-red-600">{errors.provider.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Display Name (e.g., "Momo Wallet")
          </Label>
          <Input
            {...register("displayName")}
            type="text"
            placeholder="Enter a display name"
            className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
              errors.displayName
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
            } focus:outline-none focus:ring-4`}
          />
          {errors.displayName && (
            <p className="text-sm text-red-600">{errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {isEWallet ? "Linked Phone" : "Account"} (Optional)
          </Label>
          <Input
            {...register("account")}
            type="text"
            placeholder={
              isEWallet
                ? "Enter Vietnamese phone number"
                : "Enter account details"
            }
            className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
              errors.account
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
            } focus:outline-none focus:ring-4`}
          />
          {errors.account && (
            <p className="text-sm text-red-600">{errors.account.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Input
            {...register("isDefault")}
            type="checkbox"
            id="isDefault"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <Label htmlFor="isDefault" className="text-sm text-gray-700">
            Set as default payment method
          </Label>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-black transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={
              isCreating || Object.values(errors).length > 0 || !isDirty
            }
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isCreating ? "Saving..." : "Save Payment Method"}
          </Button>
        </div>
      </div>
    </div>
  );
};
