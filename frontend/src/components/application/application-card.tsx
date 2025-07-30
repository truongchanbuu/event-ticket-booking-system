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
import { Application, APPLY_STATUS } from "@/schema";
import { StatusBadge } from "../ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";
import { cn } from "@/lib/utils";

interface ApplicationCardProps {
  application: Application;
  onApprove: () => void;
  onReject: () => void;
  onPermanentReject: () => void;
  onMarkProcessing: () => void;
  onLockByAdmin: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isPermanentRejecting: boolean;
  isMarkingProcessing: boolean;
  isLockingByAdmin: boolean;
}

const getStatusConfig = (status: APPLY_STATUS) => {
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
    [APPLY_STATUS.EDITING]: {
      icon: AlertCircle,
      color: "bg-gradient-to-r from-yellow-400 to-yellow-600",
      label: "Editing",
    },
    [APPLY_STATUS.LOCKED_BY_ADMIN]: {
      icon: ShieldAlert,
      color: "bg-gradient-to-r from-orange-500 to-red-500",
      label: "Locked by Admin",
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
  };
  return configs[status] || configs[APPLY_STATUS.PENDING];
};

export default function ApplicationCard({
  application,
  onApprove,
  onReject,
  onPermanentReject,
  onMarkProcessing,
  onLockByAdmin,
  isApproving,
  isRejecting,
  isPermanentRejecting,
  isMarkingProcessing,
  isLockingByAdmin,
}: ApplicationCardProps) {
  const router = useRouter();

  const isActionPending =
    isApproving ||
    isRejecting ||
    isPermanentRejecting ||
    isMarkingProcessing ||
    isLockingByAdmin;

  const config = getStatusConfig(application.status as APPLY_STATUS);

  const isTerminalStatus = [
    APPLY_STATUS.APPROVED,
    APPLY_STATUS.CANCELLED,
    APPLY_STATUS.PERMANENT_REJECTED,
  ].includes(application.status as APPLY_STATUS);

  const isRejected = application.status === APPLY_STATUS.REJECTED;
  const isEditing = application.status === APPLY_STATUS.EDITING;

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "relative overflow-hidden backdrop-blur-sm border-0 shadow-lg transition-all duration-300",
          isTerminalStatus && "opacity-70 grayscale",
          !isTerminalStatus &&
            "bg-white/70 hover:shadow-xl hover:-translate-y-1",
          isActionPending && "pointer-events-none"
        )}
      >
        {/* Status indicator line */}
        <div className={`absolute top-0 left-0 w-full h-1 ${config.color}`} />

        {/* Loading overlay */}
        {isActionPending && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex items-center gap-2 text-gray-600 font-semibold">
              <Clock className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </div>
          </div>
        )}

        <CardContent className="flex justify-between items-center p-4 sm:p-6">
          {/* Mobile-first layout with better structure */}
          <div className="space-y-4">
            {/* Header section - ID and Status */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-3 py-1 text-xs font-mono rounded-full bg-gray-100 text-gray-700">
                {application.applicationID}
              </span>
              <StatusBadge type="status" value={application.status} />
            </div>

            {/* Organization name */}
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
              {application.applicationData.orgName}
            </h3>

            {/* Editing indicator */}
            {isEditing && (
              <div className="flex items-center gap-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  User is currently editing this application
                </span>
                <Button variant="ghost" onClick={onLockByAdmin}>
                  Lock
                </Button>
              </div>
            )}

            {/* Date information - stacked on mobile, inline on larger screens */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>{formatDate(application.submittedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{getDaysAgo(application.submittedAt)}</span>
              </div>
            </div>

            {/* COMMENT */}
            {false && (
              <>
                {/* Action buttons section */}
                <div className="pt-2 border-t border-gray-100">
                  {/* View Details button - always visible, full width on mobile */}
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() =>
                        router.push(
                          `/admin/applications/${application.applicationID}`
                        )
                      }
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </Button>
                  </div>

                  {/* Action buttons grid */}
                  {!isTerminalStatus ? (
                    <div className="space-y-2">
                      {/* Primary action - Approve */}
                      <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2"
                        onClick={onApprove}
                        disabled={isActionPending}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isApproving ? "Approving..." : "Approve"}</span>
                      </Button>

                      {/* Secondary actions row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Mark Processing button */}
                        {(application.status === APPLY_STATUS.PENDING ||
                          isRejected) && (
                          <Button
                            variant="outline"
                            className="flex items-center justify-center gap-2"
                            onClick={onMarkProcessing}
                            disabled={isActionPending}
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span>
                              {isMarkingProcessing ? "Marking..." : "Process"}
                            </span>
                          </Button>
                        )}

                        {/* Reject actions - side by side on larger screens */}
                        <div className="flex gap-2 col-span-full sm:col-span-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                className="flex-1 min-w-0"
                                onClick={onReject}
                                disabled={isActionPending || isRejected}
                              >
                                <X className="w-4 h-4 text-white" />
                                <span className="sr-only text-white sm:not-sr-only sm:ml-1 hidden sm:inline">
                                  Reject
                                </span>
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
                                className="flex-1 min-w-0 bg-red-700 hover:bg-red-800"
                                onClick={onPermanentReject}
                                disabled={isActionPending}
                              >
                                <ShieldAlert className="w-4 h-4 text-white" />
                                <span className="sr-only text-white sm:not-sr-only sm:ml-1 hidden sm:inline">
                                  Ban
                                </span>
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
                      </div>
                    </div>
                  ) : (
                    /* Archive button for terminal states */
                    <Button
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* View Details button - always visible, full width on mobile */}
          <div className="mb-3">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() =>
                router.push(`/admin/applications/${application.applicationID}`)
              }
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View Details</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
