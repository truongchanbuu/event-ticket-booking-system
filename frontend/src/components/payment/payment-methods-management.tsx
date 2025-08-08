import React, { useState } from "react";
import {
  CreditCard,
  Smartphone,
  Plus,
  Edit3,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { usePaymentMethods } from "@/hooks/use-payment-method";
import { PaymentMethod, PaymentProvider } from "@/schema";
import { Button } from "../ui/button";
import { PaymentMethodModal } from "./payment-add-method-modal";
import { ConfirmDeleteModal } from "../ui/confirm-dialog";

const PaymentMethodsSection = ({ isEditing }: { isEditing: boolean }) => {
  const { methods, isLoading, error, deleteMethod } = usePaymentMethods();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showDeletePaymentConfirm, setShowDeletePaymentConfirm] = useState<{
    confirm: boolean;
    paymentMethodID?: string;
  }>({
    confirm: false,
    paymentMethodID: undefined,
  });
  const [showAddMethodModal, setShowAddMethodModal] = useState<{
    open: boolean;
    data?: PaymentMethod;
  }>({
    open: false,
    data: undefined,
  });

  const providerConfig: Record<
    PaymentProvider,
    {
      label: string;
      icon: React.ReactNode;
      color: string;
      bgColor: string;
      type: string;
    }
  > = {
    momo: {
      label: "MoMo",
      icon: <Smartphone className="w-5 h-5" />,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      type: "E-Wallet",
    },
  };

  const handleAddPaymentSuccess = () => {
    setShowAddMethodModal({
      open: false,
      data: undefined,
    });
  };

  const handleDeletePaymentMethod = async (paymentMethodID) => {
    try {
      await deleteMethod(paymentMethodID);
    } catch (e) {
      console.error(e);
    } finally {
      setShowDeletePaymentConfirm({
        confirm: false,
        paymentMethodID: undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white shadow-sm rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white shadow-sm rounded-2xl p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Error Loading Payment Methods</h3>
            <p className="text-sm text-red-500">Please try again later</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-white to-gray-50 shadow-lg rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
            <p className="text-sm text-gray-500">
              {methods.length} method{methods.length !== 1 ? "s" : ""}{" "}
              configured
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            setShowAddMethodModal({
              open: true,
              data: undefined,
            })
          }
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Add Payment Method</span>
        </Button>
      </div>

      {methods.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Payment Methods
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Add your first payment method to start accepting payments securely.
          </p>
          {isEditing && (
            <button
              onClick={() => console.log("Add first payment method")}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Your First Method</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => {
            const config = providerConfig[method.provider] || {
              label: method.provider.toUpperCase(),
              icon: <CreditCard className="w-5 h-5" />,
              color: "text-gray-600",
              bgColor: "bg-gray-50",
              type: "Unknown",
            };

            const isSelected = selectedMethod === method.paymentMethodID;

            return (
              <div
                key={method.paymentMethodID}
                className={`relative group border-2 rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 shadow-lg"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                } ${method.isDefault ? "ring-2 ring-green-200" : ""}`}
                onClick={() =>
                  setSelectedMethod(isSelected ? null : method.paymentMethodID)
                }
              >
                {method.isDefault && (
                  <div className="absolute -top-2 -right-2">
                    <div className="flex items-center space-x-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      <span>Default</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`p-3 ${config.bgColor} rounded-xl ${config.color} transition-transform duration-200 group-hover:scale-110`}
                    >
                      {config.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {method.displayName}
                        </h3>
                        {method.isDefault && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span className="font-medium">{config.label}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>{config.type}</span>
                        {method.account && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="font-mono">
                              ****{method.account.slice(-4)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center space-x-2 transition-opacity duration-200 ${
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() =>
                        setShowAddMethodModal({
                          open: true,
                          data: method,
                        })
                      }
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Edit method"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={method.isDefault && methods.length <= 1}
                      onClick={() =>
                        setShowDeletePaymentConfirm({
                          confirm: true,
                          paymentMethodID: method.paymentMethodID,
                        })
                      }
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Remove method"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-blue-200 text-sm text-gray-600 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">
                          Status:
                        </span>
                        <p className="text-green-600 font-medium">Active</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddMethodModal.open && (
        <PaymentMethodModal
          isOpen={showAddMethodModal.open}
          onClose={() =>
            setShowAddMethodModal({
              open: false,
              data: undefined,
            })
          }
          onSuccess={handleAddPaymentSuccess}
          initialData={showAddMethodModal.data}
        />
      )}

      {showDeletePaymentConfirm.confirm && (
        <ConfirmDeleteModal
          open={showDeletePaymentConfirm.confirm}
          onCancel={() =>
            setShowDeletePaymentConfirm({
              confirm: false,
              paymentMethodID: undefined,
            })
          }
          title="Delete Payment Method"
          description="Do you really want to delete this payment method?"
          onConfirm={async () => {
            if (showDeletePaymentConfirm.paymentMethodID) {
              await handleDeletePaymentMethod(
                showDeletePaymentConfirm.paymentMethodID
              );
            }
          }}
        />
      )}
    </section>
  );
};

export { PaymentMethodsSection };
