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
  RefreshCw,
  FileText,
  Home,
  ArrowRight,
} from "lucide-react";
import { APPLY_STATUS } from "@/schema";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface ApplicationStatusProps {
  status: APPLY_STATUS | "none";
  reason?: string;
  onRetry?: () => void;
}

const statusConfig = {
  none: {
    icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    title: "No Application Found",
    description: "You haven't submitted an event organizer application yet.",
    bgGradient: "from-amber-50 to-orange-50",
    borderColor: "border-amber-200",
    iconBg: "bg-amber-100",
    category: "neutral",
  },
  [APPLY_STATUS.PENDING]: {
    icon: <Clock className="w-12 h-12 text-blue-500" />,
    title: "Awaiting Approval",
    description: "Your application is waiting for admin review and approval.",
    bgGradient: "from-blue-50 to-indigo-50",
    borderColor: "border-blue-200",
    iconBg: "bg-blue-100",
    category: "waiting",
  },
  [APPLY_STATUS.PROCESSING]: {
    icon: <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />,
    title: "Under Review",
    description: "Our team is currently reviewing your application details.",
    bgGradient: "from-blue-50 to-indigo-50",
    borderColor: "border-blue-200",
    iconBg: "bg-blue-100",
    category: "processing",
  },
  [APPLY_STATUS.PENDING_ADMIN]: {
    icon: <Clock className="w-12 h-12 text-purple-500" />,
    title: "Admin Review Required",
    description: "Your application requires additional admin approval.",
    bgGradient: "from-purple-50 to-indigo-50",
    borderColor: "border-purple-200",
    iconBg: "bg-purple-100",
    category: "processing",
  },
  [APPLY_STATUS.APPROVED]: {
    icon: <CheckCircle className="w-12 h-12 text-green-500" />,
    title: "Application Approved! 🎉",
    description: "Congratulations! You are now an Event Organizer.",
    bgGradient: "from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    iconBg: "bg-green-100",
    category: "success",
  },
  [APPLY_STATUS.REJECTED]: {
    icon: <XCircle className="w-12 h-12 text-red-500" />,
    title: "Application Rejected",
    description:
      "Unfortunately, your application was not approved at this time.",
    bgGradient: "from-red-50 to-rose-50",
    borderColor: "border-red-200",
    iconBg: "bg-red-100",
    category: "error",
  },
  [APPLY_STATUS.PERMANENT_REJECTED]: {
    icon: <UserX className="w-12 h-12 text-red-600" />,
    title: "Permanently Rejected",
    description:
      "Your application has been permanently rejected and cannot be resubmitted.",
    bgGradient: "from-red-50 to-rose-50",
    borderColor: "border-red-300",
    iconBg: "bg-red-100",
    category: "error",
  },
  [APPLY_STATUS.CANCELLED]: {
    icon: <Ban className="w-12 h-12 text-gray-500" />,
    title: "Application Cancelled",
    description: "Your application has been cancelled.",
    bgGradient: "from-gray-50 to-slate-50",
    borderColor: "border-gray-200",
    iconBg: "bg-gray-100",
    category: "neutral",
  },
};

const ProcessingIndicator = () => (
  <div className="flex items-center gap-2 mt-4">
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-blue-500 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
    <span className="text-sm text-blue-600 font-medium">Processing</span>
  </div>
);

export const ApplicationStatus: React.FC<ApplicationStatusProps> = ({
  status,
  reason,
  onRetry,
}) => {
  const config = statusConfig[status] || statusConfig.none;
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        delay: 0.2,
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const renderActions = () => {
    const actions = [];

    // Re-apply button for rejected applications
    if (status === APPLY_STATUS.REJECTED && onRetry) {
      actions.push(
        <Button
          key="retry"
          onClick={onRetry}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          size="lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Re-apply Now
        </Button>
      );
    }

    // View applications button (always show except for approved status)
    if (status !== APPLY_STATUS.APPROVED) {
      actions.push(
        <Button
          key="view-applications"
          onClick={() => router.replace("/profile/applications")}
          variant="outline"
          className="border-2 hover:bg-gray-50 transition-all duration-200"
          size="lg"
        >
          <FileText className="w-4 h-4 mr-2" />
          View Applications
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      );
    }

    // Home button
    actions.push(
      <Button
        key="home"
        onClick={() => router.replace("/")}
        variant={status === APPLY_STATUS.APPROVED ? "default" : "ghost"}
        className={`transition-all duration-200 hover:font-bold ${
          status === APPLY_STATUS.APPROVED
            ? "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
            : "hover:bg-transparent"
        }`}
        size="lg"
      >
        <Home className="w-4 h-4 mr-2" />
        {status === APPLY_STATUS.APPROVED ? "Start Organizing" : "Back to Home"}
      </Button>
    );

    return actions;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`
        relative overflow-hidden rounded-2xl border-2 ${config.borderColor}
        bg-gradient-to-br ${config.bgGradient}
        shadow-xl hover:shadow-2xl transition-all duration-300
        max-w-lg mx-auto p-8
      `}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        {/* Icon */}
        <motion.div
          variants={iconVariants}
          className={`
            p-4 rounded-full ${config.iconBg}
            ring-4 ring-white/50 shadow-lg
          `}
        >
          {config.icon}
        </motion.div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
          <p className="text-gray-600 leading-relaxed max-w-sm">
            {config.description}
          </p>
        </div>

        {/* Processing indicator for active statuses */}
        {(status === APPLY_STATUS.PROCESSING ||
          status === APPLY_STATUS.PENDING) && <ProcessingIndicator />}

        {/* Rejection reason */}
        {status === APPLY_STATUS.REJECTED && reason && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="w-full p-4 bg-red-100 border border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-700 font-medium mb-1">
              Rejection Reason:
            </p>
            <p className="text-sm text-red-600">{reason}</p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full pt-4">
          {renderActions().map((action, index) => (
            <motion.div
              key={action.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              {action}
            </motion.div>
          ))}
        </div>

        {/* Success confetti effect */}
        {status === APPLY_STATUS.APPROVED && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, delay: 0.5 }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-green-400 rounded-full"
                initial={{
                  x: "50%",
                  y: "50%",
                  scale: 0,
                }}
                animate={{
                  x: Math.random() * 400 - 200,
                  y: Math.random() * 400 - 200,
                  scale: [0, 1, 0],
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ApplicationStatus;
