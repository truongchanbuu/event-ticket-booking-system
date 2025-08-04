import React from "react";
import { RefreshCw, Database, AlertCircle } from "lucide-react";

const EmptyStateUI = ({ refetch }) => {
  const applicationData = null; // This simulates your condition

  if (!applicationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          {/* Main Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center transform transition-all duration-300 hover:scale-105">
            {/* Icon Container */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Database className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No Data Available
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                We couldn't load your application data. This might be due to a
                temporary connection issue or the data hasn't been initialized
                yet.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={refetch}
              className="group relative w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center space-x-3">
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Reload Data</span>
              </div>

              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>

            {/* Additional Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200">
                Check Status
              </button>
              <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200">
                Contact Support
              </button>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Having trouble? Try refreshing the page or contact our support
              team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // This would be your normal component when data exists
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Application Dashboard
        </h1>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Your application data would be displayed here...
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyStateUI;
