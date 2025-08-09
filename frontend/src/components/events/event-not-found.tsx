"use client";

import React from "react";
import { Search, Calendar, ArrowLeft, Home, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface EventNotFoundProps {
  onGoBack?: () => void;
  onGoHome?: () => void;
  onRetry?: () => void;
  showSuggestions?: boolean;
}

const EventNotFound = ({
  onGoBack,
  onGoHome,
  onRetry,
  showSuggestions = true,
}: EventNotFoundProps) => {
  const router = useRouter();

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.back();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.replace("/");
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      router.refresh();
    }
  };

  const suggestedEvents = [
    {
      id: 1,
      title: "Music Festival 2025",
      date: "Jul 15, 2025",
      type: "Music",
    },
    {
      id: 2,
      title: "Tech Conference",
      date: "Aug 20, 2025",
      type: "Conference",
    },
    { id: 3, title: "Art Exhibition", date: "Sep 10, 2025", type: "Art" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center px-4 pb-6">
      <div className="w-full">
        {/* Main Error Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Content Section */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <p className="text-gray-600 text-lg mb-6">
                The event may have been removed, expired, or the link might be
                incorrect.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGoBack}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Go Back
                </button>

                <button
                  onClick={handleRetry}
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  <RefreshCcw className="w-5 h-5 mr-2" />
                  Try Again
                </button>

                <button
                  onClick={handleGoHome}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Browse Events
                </button>
              </div>
            </div>

            {/* Search Section */}
            <div className="border-t border-gray-100 pt-8">
              <div className="text-center mb-6">
                <Search className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Find Other Events
                </h3>
                <button className="text-gray-600">
                  Search for events that match your interests
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for events, artists, or venues..."
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 placeholder-gray-400"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200">
                  Search
                </button>
              </div>

              {/* Suggested Events */}
              {showSuggestions && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Popular Events
                  </h4>
                  <div className="grid gap-4">
                    {suggestedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                              {event.title}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {event.date}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                            {event.type}
                          </span>
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <ArrowLeft className="w-4 h-4 text-blue-600 rotate-180" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Need help? Contact our{" "}
            <a
              href="#"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              support team
            </a>{" "}
            or check our{" "}
            <a
              href="#"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              FAQ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventNotFound;
