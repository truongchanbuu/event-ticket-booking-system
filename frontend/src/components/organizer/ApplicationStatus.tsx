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

interface ApplicationStatusProps {
  status: APPLY_STATUS | "none";
  reason?: string;
  onRetry?: () => void;
}

const statusMap = {
  none: {
    icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
    text: "Bạn chưa gửi đơn đăng ký tổ chức sự kiện.",
  },
  [APPLY_STATUS.PENDING]: {
    icon: <Clock className="w-8 h-8 text-blue-500 animate-pulse" />,
    text: "Đơn đăng ký của bạn đang chờ duyệt.",
  },
  [APPLY_STATUS.PROCESSING]: {
    icon: <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />,
    text: "Đơn đăng ký của bạn đang được xử lý.",
  },
  [APPLY_STATUS.PENDING_ADMIN]: {
    icon: <Clock className="w-8 h-8 text-blue-500 animate-pulse" />,
    text: "Đơn đăng ký đang chờ admin duyệt.",
  },
  [APPLY_STATUS.APPROVED]: {
    icon: <CheckCircle className="w-8 h-8 text-green-500" />,
    text: "Bạn đã trở thành Event Organizer!",
  },
  [APPLY_STATUS.REJECTED]: {
    icon: <XCircle className="w-8 h-8 text-red-500" />,
    text: "Đơn đăng ký của bạn đã bị từ chối.",
  },
  [APPLY_STATUS.PERMANENT_REJECTED]: {
    icon: <UserX className="w-8 h-8 text-red-500" />,
    text: "Đơn đăng ký của bạn bị từ chối vĩnh viễn.",
  },
  [APPLY_STATUS.CANCELLED]: {
    icon: <Ban className="w-8 h-8 text-gray-400" />,
    text: "Đơn đăng ký đã bị hủy.",
  },
  [APPLY_STATUS.DEACTIVATED]: {
    icon: <Ban className="w-8 h-8 text-gray-400" />,
    text: "Tài khoản tổ chức sự kiện đã bị vô hiệu hóa.",
  },
};

export const ApplicationStatus: React.FC<ApplicationStatusProps> = ({
  status,
  reason,
  onRetry,
}) => {
  const info = statusMap[status] || statusMap.none;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 p-6 border rounded-lg bg-white shadow max-w-md mx-auto"
    >
      {info.icon}
      <div className="font-semibold text-lg text-center">{info.text}</div>
      {status === APPLY_STATUS.REJECTED && reason && (
        <div className="text-red-500 text-center">Lý do: {reason}</div>
      )}
      {status === APPLY_STATUS.REJECTED && onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Re-apply
        </button>
      )}
    </motion.div>
  );
};

export default ApplicationStatus;
