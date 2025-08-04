import { PAYMENT_STATUS } from "@/schema";

export const FilterTabs = ({
  activeFilter,
  onFilterChange,
  filteredCount,
  totalCount,
  purchases,
}) => {
  const filters = [
    { key: "ALL", label: "All", count: totalCount },
    {
      key: "SUCCESS",
      label: "Success",
      count: purchases.filter((p) => p.paymentStatus === PAYMENT_STATUS.SUCCESS)
        .length,
    },
    {
      key: "PENDING",
      label: "Pending",
      count: purchases.filter((p) => p.paymentStatus === PAYMENT_STATUS.PENDING)
        .length,
    },
    {
      key: "FAILED",
      label: "Failed",
      count: purchases.filter((p) => p.paymentStatus === PAYMENT_STATUS.FAILED)
        .length,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
      {filters.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`flex-1 min-w-0 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeFilter === key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="truncate">{label}</span>
          {count > 0 && (
            <span
              className={`ml-1 text-xs ${
                activeFilter === key ? "text-gray-600" : "text-gray-400"
              }`}
            >
              ({key === "ALL" ? filteredCount : count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
