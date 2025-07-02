import React from "react";

const LoadingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        {/* Main Logo/Brand Area */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">TicketHub</h1>
          <p className="text-gray-600">Your gateway to amazing events</p>
        </div>

        {/* Loading Animation */}
        <div className="mb-8">
          {/* Ticket Animation */}
          <div className="relative">
            <div className="flex justify-center space-x-2 mb-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-16 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-md transform transition-all duration-1000 ease-in-out"
                  style={{
                    animation: `ticketFloat 2s ease-in-out infinite ${i * 0.2}s`,
                  }}
                >
                  <div className="w-full h-full bg-white/20 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
              style={{
                animation: "progressFill 3s ease-in-out infinite",
              }}
            ></div>
          </div>

          {/* Loading Dots */}
          <div className="flex justify-center space-x-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-blue-500 rounded-full"
                style={{
                  animation: `bounce 1.4s ease-in-out infinite both ${i * 0.16}s`,
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-gray-600 font-medium">
          <div className="animate-pulse">
            Finding the best events for you...
          </div>
        </div>

        {/* Status Messages */}
        <div className="mt-6 text-sm text-gray-500">
          <div className="animate-fade-in-out">
            <span>Loading your journey...</span>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-20 animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-24 h-24 bg-purple-100 rounded-full opacity-20 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-5 w-16 h-16 bg-pink-100 rounded-full opacity-20 animate-pulse"
          style={{ animationDelay: "0.5s" }}
        ></div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes ticketFloat {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }

        @keyframes progressFill {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 100%;
          }
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        @keyframes fade-in-out {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-fade-in-out {
          animation: fade-in-out 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingPage;
