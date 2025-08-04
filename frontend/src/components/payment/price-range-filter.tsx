import { DollarSign } from "lucide-react";
import { useState } from "react";

// Price Range Filter Component
export const PriceRangeFilter = ({ priceRange, onPriceRangeChange }) => {
  const [isCustom, setIsCustom] = useState(false);

  const ranges = [
    { label: "All Prices", min: 0, max: Infinity },
    { label: "Under $50", min: 0, max: 50 },
    { label: "$50 - $100", min: 50, max: 100 },
    { label: "$100 - $200", min: 100, max: 200 },
    { label: "$200 - $500", min: 200, max: 500 },
    { label: "Over $500", min: 500, max: Infinity },
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700">Price Range</label>
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-gray-400" />
        {!isCustom ? (
          <select
            value={`${priceRange.min}-${priceRange.max}`}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setIsCustom(true);
              } else {
                const [min, max] = e.target.value.split("-").map(Number);
                onPriceRangeChange({ min, max });
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {ranges.map((range) => (
              <option key={range.label} value={`${range.min}-${range.max}`}>
                {range.label}
              </option>
            ))}
            <option value="custom">Custom Range</option>
          </select>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min === 0 ? "" : priceRange.min}
              onChange={(e) => {
                const min = e.target.value === "" ? 0 : Number(e.target.value);
                onPriceRangeChange({ ...priceRange, min });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-md"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max === Infinity ? "" : priceRange.max}
              onChange={(e) => {
                const max =
                  e.target.value === "" ? Infinity : Number(e.target.value);
                onPriceRangeChange({ ...priceRange, max });
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
