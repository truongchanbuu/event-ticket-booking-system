import { History, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Header from "@/components/app-header";

type PaymentHeaderProps = {
  variant?: "default" | "dark" | "gradient";
  sticky?: boolean;
  currentStep?: string;
  showBackButton?: boolean;
};

export default function PaymentHeader({
  variant = "default",
  sticky = false,
  currentStep,
  showBackButton = true,
}: PaymentHeaderProps) {
  const getLinkStyles = () => {
    const base =
      "flex items-center space-x-2 text-md font-medium transition-all duration-200 hover:scale-105";
    switch (variant) {
      case "dark":
        return `${base} text-gray-300 hover:text-white hover:shadow-lg`;
      case "gradient":
        return `${base} text-white/90 hover:text-white hover:shadow-lg`;
      default:
        return `${base} text-gray-600 hover:text-blue-600 hover:shadow-md`;
    }
  };

  const getStepStyles = () => {
    const base = "text-sm font-medium px-3 py-1 rounded-full";
    switch (variant) {
      case "dark":
        return `${base} bg-gray-800 text-gray-300 border border-gray-600`;
      case "gradient":
        return `${base} bg-white/20 text-white border border-white/20 backdrop-blur-sm`;
      default:
        return `${base} bg-blue-50 text-blue-700 border border-blue-200`;
    }
  };

  const customTabs = (
    <>
      {/* Current Step Indicator */}
      {currentStep && <div className={getStepStyles()}>{currentStep}</div>}

      {/* Payment History Button */}
      <Link href="/payment/history" className={getLinkStyles()}>
        <History className="w-4 h-4" />
        <span className="hidden sm:inline">History</span>
      </Link>
    </>
  );

  return (
    <Header
      showTabs={true}
      customTabs={customTabs}
      variant={variant}
      sticky={sticky}
      showSearch={false}
    />
  );
}
