import React from "react";

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  color?: string;
  value: string;
}

const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  color = "text-blue-600",
}: StatCardProps) => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <div className="flex items-center">
      <div
        className={`p-2 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100")}`}
      >
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export default StatCard;
