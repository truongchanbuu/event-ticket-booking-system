"use client";

import { Button } from "@/components/ui/button";
import { ORGANIZER_STATUS } from "@/schema";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  Calendar,
  Info,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import React, { useCallback } from "react";
import { useRouter } from "next/navigation";

interface OrganizerStatusProps {
  status?: ORGANIZER_STATUS;
  onGoHome?: () => void;
  onViewDetail?: () => void;
}

const STATUS_CONFIG = {
  [ORGANIZER_STATUS.NONE]: {
    icon: <Info className="w-12 h-12 text-gray-400" />,
    title: "You haven’t applied yet",
    description: "Start your journey as an event organizer today!",
  },
  [ORGANIZER_STATUS.PENDING]: {
    icon: <Clock className="w-12 h-12 text-yellow-500" />,
    title: "Application Pending",
    description:
      "We’re currently reviewing your application. Please wait patiently.",
  },
  [ORGANIZER_STATUS.APPROVED]: {
    icon: <CheckCircle className="w-12 h-12 text-green-500" />,
    title: "You’re Approved!",
    description: "Congratulations! You can now start organizing events.",
  },
  [ORGANIZER_STATUS.REJECTED]: {
    icon: <XCircle className="w-12 h-12 text-red-500" />,
    title: "Application Rejected",
    description:
      "Unfortunately, your application was rejected. You can re-apply if you'd like.",
  },
  [ORGANIZER_STATUS.PERMANENTLY_REJECTED]: {
    icon: <Ban className="w-12 h-12 text-gray-500" />,
    title: "Application Permanently Rejected",
    description: "You’re not eligible to re-apply at this time.",
  },
  [ORGANIZER_STATUS.BANNED]: {
    icon: <Calendar className="w-12 h-12 text-orange-500" />,
    title: "Organizer Suspended",
    description: "Your organizer privileges are currently suspended.",
  },
};

export const OrganizerStatus: React.FC<OrganizerStatusProps> = ({
  status,
  onViewDetail,
  onGoHome,
}) => {
  const router = useRouter();

  const onBackHome = useCallback(() => {
    if (onGoHome) onGoHome();
    else router.back();
  }, [onGoHome, router]);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[ORGANIZER_STATUS.NONE];

  const actionButtons = [
    <Button
      type="button"
      key="view-detail"
      className="w-full"
      onClick={onViewDetail}
    >
      View Detail
    </Button>,
    <Button
      type="button"
      key={status === ORGANIZER_STATUS.APPROVED ? "start-event" : "home"}
      variant="ghost"
      className="w-full"
      onClick={onBackHome}
    >
      {status !== ORGANIZER_STATUS.APPROVED && (
        <ArrowLeft className="ml-2 h-4 w-4" />
      )}
      {status === ORGANIZER_STATUS.APPROVED
        ? "Start Your Event"
        : "Back to Home"}
      {status === ORGANIZER_STATUS.APPROVED && (
        <ArrowRight className="ml-2 h-4 w-4" />
      )}
    </Button>,
  ].filter(Boolean);

  return (
    <div className="relative max-w-md mx-auto px-6 py-10 text-center bg-white shadow-xl rounded-2xl space-y-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {config.icon}
      </motion.div>

      <h2 className="text-2xl font-semibold">{config.title}</h2>
      <p className="text-muted-foreground">{config.description}</p>

      <div className="space-y-2">
        {actionButtons.map((element, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            {element}
          </motion.div>
        ))}
      </div>

      {status === ORGANIZER_STATUS.APPROVED && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-yellow-400"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: ["0%", "-100%"],
                opacity: [1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
              }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
