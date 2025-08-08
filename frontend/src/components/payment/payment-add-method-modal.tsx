import React, { useState } from "react";
import { PaymentMethodForm } from "./payment-method-form";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { PaymentMethod } from "@/schema";

interface PaymentMethodFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: PaymentMethod;
}

export const PaymentMethodModal = ({
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: PaymentMethodFormProps) => {
  const handleSuccess = () => {
    onClose();
    console.log("Payment method created successfully!");
    onSuccess();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Button
        variant="ghost"
        onClick={onClose}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
      >
        Add Payment Method
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 pt-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Payment Method
                </h2>
                <Button
                  variant="link"
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </Button>
              </div>
            </div>

            <PaymentMethodForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              initialData={initialData}
            />
          </div>
        </div>
      )}
    </div>
  );
};
