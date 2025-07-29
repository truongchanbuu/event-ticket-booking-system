// File: hooks/useStatusInfo.ts
import { APPLY_STATUS } from "@/schema";
import { AlertCircle, Ban, CheckCircle, XCircle } from "lucide-react";
import { useCallback } from "react";

export const useStatusInfo = (reason?: string) => {
  const getStatusInfo = useCallback((status: APPLY_STATUS) => {
    switch (status) {
      case APPLY_STATUS.APPROVED:
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
          text: "Approved",
          description: "Your application has been successfully approved!",
        };
      case APPLY_STATUS.REJECTED:
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          icon: XCircle,
          text: "Rejected",
          description:
            "Your application has been rejected. Please check the reason and resubmit if necessary.",
        };
      case APPLY_STATUS.PENDING:
      case APPLY_STATUS.PENDING_ADMIN:
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: AlertCircle,
          text: "Pending",
          description:
            "Your application is under review. Please wait for updates.",
          reason,
        };
      case APPLY_STATUS.PROCESSING:
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: AlertCircle,
          text: "Under Review",
          description: "An admin is currently reviewing your application.",
        };
      case APPLY_STATUS.PERMANENT_REJECTED:
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: Ban,
          text: "Permanently Rejected",
          description:
            "Your application has been permanently rejected. Please contact support for clarification.",
          reason,
        };
      case APPLY_STATUS.CANCELLED:
        return {
          color: "bg-gray-100 text-gray-600 border-gray-200",
          icon: XCircle,
          text: "Cancelled",
          description: "You have cancelled your application.",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: AlertCircle,
          text: "Not Submitted",
          description: "Your application has not been submitted yet.",
        };
    }
  }, []);

  return { getStatusInfo };
};
