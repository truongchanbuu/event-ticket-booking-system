import React from "react";
import { AlertCircle, ArrowLeft, RefreshCw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ErrorConnectScreen({
  refreshUserProfile,
}: {
  refreshUserProfile: () => void;
}) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Error Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          {/* Error Icon with Animation */}
          <div className="relative mb-6">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <WifiOff className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-slate-800 mb-3">
            Connection Failed
          </h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            We couldn't connect to our servers. Please check your internet
            connection and try again.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={refreshUserProfile}
              className="primary w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>

            <button
              onClick={() => router.push("/")}
              className="secondary w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            If the problem persists, please contact our support team
          </p>
        </div>
      </div>
    </div>
  );
}
