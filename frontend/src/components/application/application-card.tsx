"use client";

import {
  AlertCircle,
  Archive,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Eye,
  ShieldAlert,
  X,
  XCircle,
  UserX,
} from "lucide-react";
import { Button } from "../ui/button";
import { formatDate, getDaysAgo } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { useRouter } from "next/navigation";
import { Application, APPLY_STATUS } from "@/schema"; // ✨ Sử dụng schema type
import { StatusBadge } from "../ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "@/lib/utils"; // Giả sử bạn có hàm cn (classnames) từ shadcn/ui

// ✨ STEP 1: Định nghĩa Props một cách chặt chẽ
interface ApplicationCardProps {
  application: Application; // Sử dụng type Application thay vì any
  onApprove: () => void;
  onReject: () => void;
  onPermanentReject: () => void;
  onMarkProcessing: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isPermanentRejecting: boolean;
  isMarkingProcessing: boolean;
}

// Giữ lại các helper tuyệt vời của bạn
const getStatusConfig = (status: APPLY_STATUS) => {
  // ... giữ nguyên logic getStatusConfig của bạn
  // (đã được chuyển đổi sang dùng enum APPLY_STATUS để an toàn hơn)
  const configs = {
    [APPLY_STATUS.PENDING]: {
      icon: Clock,
      color: "bg-gradient-to-r from-amber-400 to-orange-500",
      label: "Pending",
    },
    [APPLY_STATUS.PENDING_ADMIN]: {
      icon: Clock,
      color: "bg-gradient-to-r from-amber-400 to-orange-500",
      label: "Pending Admin",
    },
    [APPLY_STATUS.PROCESSING]: {
      icon: AlertCircle,
      color: "bg-gradient-to-r from-blue-500 to-purple-600",
      label: "Processing",
    },
    [APPLY_STATUS.APPROVED]: {
      icon: CheckCircle,
      color: "bg-gradient-to-r from-emerald-400 to-green-600",
      label: "Approved",
    },
    [APPLY_STATUS.REJECTED]: {
      icon: XCircle,
      color: "bg-gradient-to-r from-red-400 to-pink-500",
      label: "Rejected",
    },
    [APPLY_STATUS.PERMANENT_REJECTED]: {
      icon: XCircle,
      color: "bg-gradient-to-r from-red-400 to-pink-500",
      label: "Permanently Rejected",
    },
    [APPLY_STATUS.CANCELLED]: {
      icon: UserX,
      color: "bg-gradient-to-r from-gray-400 to-gray-600",
      label: "Cancelled by User",
    },
    // Thêm các trạng thái khác nếu cần
  };
  return configs[status] || configs[APPLY_STATUS.PENDING];
};

export default function ApplicationCard({
  application,
  onApprove,
  onReject,
  onPermanentReject,
  onMarkProcessing,
  isApproving,
  isRejecting,
  isPermanentRejecting,
  isMarkingProcessing,
}: ApplicationCardProps) {
  const router = useRouter();

  // ✨ STEP 2: Tạo một biến tổng hợp cho trạng thái loading
  const isActionPending =
    isApproving || isRejecting || isPermanentRejecting || isMarkingProcessing;

  const config = getStatusConfig(application.status as APPLY_STATUS);

  // Các trạng thái cuối cùng, không thể thay đổi
  const isTerminalStatus = [
    APPLY_STATUS.APPROVED,
    APPLY_STATUS.CANCELLED,
    APPLY_STATUS.PERMANENT_REJECTED,
  ].includes(application.status as APPLY_STATUS);

  // Trạng thái đã bị từ chối (nhưng có thể được xem xét lại)
  const isRejected = application.status === APPLY_STATUS.REJECTED;

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "relative overflow-hidden backdrop-blur-sm border-0 shadow-lg transition-all duration-300",
          isTerminalStatus && "opacity-70 grayscale", // Áp dụng hiệu ứng cho các trạng thái cuối
          !isTerminalStatus &&
            "bg-white/70 hover:shadow-xl hover:-translate-y-1",
          isActionPending && "pointer-events-none" // Ngăn click khi đang xử lý
        )}
      >
        {/* Status indicator line */}
        <div className={`absolute top-0 left-0 w-full h-1 ${config.color}`} />

        {/* ✨ STEP 3: Thêm overlay loading */}
        {isActionPending && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex items-center gap-2 text-gray-600 font-semibold">
              <Clock className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </div>
          </div>
        )}

        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 relative z-10">
            {/* Left section - Thông tin đơn */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 text-xs font-mono rounded-full bg-gray-100 text-gray-700">
                  {application.id}
                </span>
                <StatusBadge type="status" value={application.status} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {application.applicationData.orgName}{" "}
                {/* Sửa lại theo schema */}
              </h3>
              {/* ... Các thông tin khác giữ nguyên ... */}
              <div className="flex justify-start items-center gap-6 text-sm text-gray-600">
                <div className="flex justify-start items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(application.createdAt)}</span>{" "}
                  {/* Sửa lại theo schema */}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{getDaysAgo(application.createdAt)}</span>{" "}
                  {/* Sửa lại theo schema */}
                </div>
              </div>
            </div>

            {/* ✨ STEP 4: Right section - Hiển thị các nút Actions một cách thông minh */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full sm:w-auto lg:w-40">
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 w-full"
                onClick={() =>
                  router.push(`/admin/applications/${application.id}`)
                }
              >
                <Eye className="w-4 h-4" />
                <span>Details</span>
              </Button>

              {/* Chỉ hiển thị các action khi trạng thái không phải là trạng thái cuối */}
              {!isTerminalStatus && (
                <>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 w-full"
                    onClick={onApprove}
                    disabled={isActionPending}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isApproving ? "Approving..." : "Approve"}</span>
                  </Button>

                  {/* Cho phép "Mark Processing" nếu đang pending hoặc đã bị reject */}
                  {(application.status === APPLY_STATUS.PENDING ||
                    isRejected) && (
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-2 w-full"
                      onClick={onMarkProcessing}
                      disabled={isActionPending}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {isMarkingProcessing ? "Marking..." : "Process"}
                      </span>
                    </Button>
                  )}

                  <div className="flex gap-2 w-full">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={onReject}
                          disabled={isActionPending || isRejected}
                        >
                          <X className="w-4 h-4 text-white" />
                          <span className="sr-only">Reject</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reject (can be reviewed later)</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1 bg-red-700 hover:bg-red-800"
                          onClick={onPermanentReject}
                          disabled={isActionPending}
                        >
                          <ShieldAlert className="w-4 h-4 text-white" />
                          <span className="sr-only">Permanently Reject</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-red-800 text-white border-red-800"
                      >
                        <p>Permanently Reject (Cannot be undone)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </>
              )}

              {/* Nếu là trạng thái cuối, có thể hiển thị nút Archive */}
              {isTerminalStatus && (
                <Button
                  variant="secondary"
                  className="w-full flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
