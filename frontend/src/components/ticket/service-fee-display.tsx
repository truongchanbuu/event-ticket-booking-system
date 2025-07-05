import { formatCurrency } from "@/lib/utils";

interface ServiceFeeDisplayProps {
  serviceFee: number;
  quantity?: number;
  variant?: "inline" | "detailed";
  className?: string;
}

export default function ServiceFeeDisplay({
  serviceFee,
  quantity = 1,
  variant = "inline",
  className = "",
}: ServiceFeeDisplayProps) {
  if (serviceFee <= 0) return null;

  const totalServiceFee = serviceFee * quantity;

  if (variant === "detailed") {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        <div>Service fee: {formatCurrency(serviceFee)} per ticket</div>
        {quantity > 1 && (
          <div>Total fees: {formatCurrency(totalServiceFee)}</div>
        )}
      </div>
    );
  }

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      +{formatCurrency(serviceFee)} fee
    </div>
  );
}
