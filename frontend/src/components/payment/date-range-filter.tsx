import { Calendar } from "lucide-react";
import { useState } from "react";

// Date Range Filter Component
export const DateRangeFilter = ({ dateRange, onDateRangeChange }) => {
  const [isCustom, setIsCustom] = useState(false);

  const ranges = [
    { label: "All Time", days: Infinity },
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "Last 6 months", days: 180 },
    { label: "Last year", days: 365 },
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700">Date Range</label>
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-400" />
        {!isCustom ? (
          <select
            value={dateRange.days}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setIsCustom(true);
              } else {
                const days =
                  e.target.value === "Infinity"
                    ? Infinity
                    : Number(e.target.value);
                onDateRangeChange({ days });
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {ranges.map((range) => (
              <option key={range.label} value={range.days}>
                {range.label}
              </option>
            ))}
            <option value="custom">Custom Range</option>
          </select>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate || ""}
              onChange={(e) => {
                onDateRangeChange({ ...dateRange, startDate: e.target.value });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate || ""}
              onChange={(e) => {
                onDateRangeChange({ ...dateRange, endDate: e.target.value });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
            />
            <button
              onClick={() => setIsCustom(false)}
              className="px-2 py-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
