"use client";

import React from "react";
import { ShieldX, Home, ArrowLeft, Mail, HelpCircle } from "lucide-react";

const AccessDeniedPage = () => {
  const handleGoHome = () => {
    // Navigate to home page
    window.location.href = "/";
  };

  const handleGoBack = () => {
    // Go back to previous page
    window.history.back();
  };

  const handleContactSupport = () => {
    // Open email client or contact form
    window.location.href =
      "mailto:support@company.com?subject=Access%20Request";
  };

  const handleHelp = () => {
    // Navigate to help/FAQ page
    window.location.href = "/help";
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          You are not allowed to access
        </h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          You do not have permission to access this page. Please check your
          login information or contact the administrator for assistance.
        </p>

        {/* Error Code */}
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <span className="text-sm text-gray-500">Mã lỗi: </span>
          <span className="text-sm font-mono text-gray-700">
            403 - Forbidden
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary Action - Go Home */}
          <button
            onClick={handleGoHome}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Homepage
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoBack}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleHelp}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </button>
          </div>

          {/* Contact Support */}
          <button
            onClick={handleContactSupport}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <Mail className="w-4 h-4" />
            Support Contact
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            If you believe this is an error, please take a screenshot and send
            it to the technical support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
