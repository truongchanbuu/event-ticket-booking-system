import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  title?: string;
}

export default function LoadingSpinner({ title }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="text-sm font-medium">{title ?? "Loading..."}</span>
    </div>
  );
}
