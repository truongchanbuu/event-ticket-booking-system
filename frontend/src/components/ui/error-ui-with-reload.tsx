import React from "react";
import { AlertTriangle, RefreshCw, Wifi, Server } from "lucide-react";

export const ErrorMessage = ({
  error,
  onReload,
}: {
  error: string;
  onReload?: () => void;
}) => {
  const getErrorDetails = (error) => {
    const errorMessage = error?.message || error || "There is something wrong";

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return {
        icon: Wifi,
        title: "Network Error",
        message: "Cannot connect to Internet.",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      };
    }

    if (errorMessage.includes("server") || errorMessage.includes("500")) {
      return {
        icon: Server,
        title: "Server Error",
        message: "There is something wrong with server.",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
      };
    }

    return {
      icon: AlertTriangle,
      title: "There is something wrong.",
      message: errorMessage,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    };
  };

  const errorDetails = getErrorDetails(error);
  const Icon = errorDetails.icon;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div
        className={`max-w-md w-full ${errorDetails.bgColor} ${errorDetails.borderColor} border rounded-2xl p-8 text-center shadow-sm`}
      >
        {/* Error Icon */}
        <div
          className={`inline-flex items-center justify-center w-16 h-16 ${errorDetails.bgColor} rounded-full mb-6`}
        >
          <Icon size={32} className={errorDetails.color} />
        </div>

        {/* Error Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {errorDetails.title}
        </h3>

        {/* Error Message */}
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          {errorDetails.message}
        </p>

        {/* Reload Button */}
        <button
          onClick={onReload}
          className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group"
        >
          <RefreshCw
            size={18}
            className="mr-2 group-hover:rotate-180 transition-transform duration-300"
          />
          Reload
        </button>
      </div>
    </div>
  );
};
