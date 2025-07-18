import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  Loader2,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { APPLY_STATUS } from "@/schema";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface ApplicationStatusProps {
  status: APPLY_STATUS | "none";
  reason?: string;
  onRetry?: () => void;
}

const statusMap = {
  none: {
    icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
    text: "You have not submitted an event organizer application yet.",
  },
  [APPLY_STATUS.PENDING]: {
    icon: <Clock className="w-8 h-8 text-blue-500 animate-pulse" />,
    text: "Your application is pending approval.",
  },
  [APPLY_STATUS.PROCESSING]: {
    icon: <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />,
    text: "Your application is being processed.",
  },
  [APPLY_STATUS.PENDING_ADMIN]: {
    icon: <Clock className="w-8 h-8 text-blue-500 animate-pulse" />,
    text: "Your application is awaiting admin review.",
  },
  [APPLY_STATUS.APPROVED]: {
    icon: <CheckCircle className="w-8 h-8 text-green-500" />,
    text: "You are now an Event Organizer!",
  },
  [APPLY_STATUS.REJECTED]: {
    icon: <XCircle className="w-8 h-8 text-red-500" />,
    text: "Your application has been rejected.",
  },
  [APPLY_STATUS.PERMANENT_REJECTED]: {
    icon: <UserX className="w-8 h-8 text-red-500" />,
    text: "Your application has been permanently rejected.",
  },
  [APPLY_STATUS.CANCELLED]: {
    icon: <Ban className="w-8 h-8 text-gray-400" />,
    text: "Your application has been canceled.",
  },
  [APPLY_STATUS.DEACTIVATED]: {
    icon: <Ban className="w-8 h-8 text-gray-400" />,
    text: "Your organizer account has been deactivated.",
  },
};

export const ApplicationStatus: React.FC<ApplicationStatusProps> = ({
  status,
  reason,
  onRetry,
}) => {
  const info = statusMap[status] || statusMap.none;
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 p-6 border rounded-lg bg-white shadow max-w-md mx-auto"
    >
      {info.icon}
      <div className="font-semibold text-lg text-center">{info.text}</div>
      {status === APPLY_STATUS.REJECTED && reason && (
        <div className="text-red-500 text-center">Lý do: {reason}</div>
      )}
      {status === APPLY_STATUS.REJECTED && onRetry && (
        <Button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Re-apply
        </Button>
      )}
      <Button
        onClick={() => router.replace("/")}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Back to Home
      </Button>
    </motion.div>
  );
};

export default ApplicationStatus;
