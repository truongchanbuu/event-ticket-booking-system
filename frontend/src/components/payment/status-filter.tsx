import { PAYMENT_STATUS } from "@/schema";

// Status Filter Component
export const StatusFilter = ({ selectedStatuses, onStatusChange }) => {
  const statuses = [
    {
      value: PAYMENT_STATUS.SUCCESS,
      label: "Success",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 border-emerald-200",
      checkColor: "text-emerald-600 focus:ring-emerald-500",
    },
    {
      value: PAYMENT_STATUS.PENDING,
      label: "Pending",
      color: "text-amber-600",
      bgColor: "bg-amber-50 border-amber-200",
      checkColor: "text-amber-600 focus:ring-amber-500",
    },
    {
      value: PAYMENT_STATUS.FAILED,
      label: "Failed",
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
      checkColor: "text-red-600 focus:ring-red-500",
    },
  ];

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-800 tracking-wide">
        Payment Status
      </label>
      <div className="space-y-2">
        {statuses.map((status) => {
          const isSelected = selectedStatuses.includes(status.value);
          return (
            <label
              key={status.value}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer
                hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                ${
                  isSelected
                    ? `${status.bgColor} shadow-sm border-opacity-60`
                    : "bg-white border-gray-200 hover:border-gray-300"
                }
              `}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onStatusChange([...selectedStatuses, status.value]);
                    } else {
                      onStatusChange(
                        selectedStatuses.filter((s) => s !== status.value)
                      );
                    }
                  }}
                  className="sr-only"
                />
                <div
                  className={`
                  w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
                  ${
                    isSelected
                      ? `${
                          status.value === PAYMENT_STATUS.SUCCESS
                            ? "bg-emerald-600 border-emerald-600"
                            : status.value === PAYMENT_STATUS.PENDING
                              ? "bg-amber-600 border-amber-600"
                              : "bg-red-600 border-red-600"
                        }`
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }
                `}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span
                className={`text-sm font-medium ${status.color} select-none`}
              >
                {status.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
