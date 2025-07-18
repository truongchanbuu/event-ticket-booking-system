"use client";

import React from "react";
import { APPLY_STATUS } from "@/schema/enums/apply-status";
import { ApplyOrganizerForm } from "@/components/organizer/ApplyOrganizerForm";
import ApplicationStatus from "@/components/organizer/ApplicationStatus";
import LoadingPage from "@/components/app-loading";
import ProtectedRoute from "@/components/ProtectRoute";
import { useUser } from "@/hooks/use-user";
import { APP_EMAIL } from "@/constants/app";

export default function ApplyOrganizerPage() {
  const [status, setStatus] = React.useState<APPLY_STATUS>(
    APPLY_STATUS.PROCESSING
  );
  const [reason, setReason] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);

  const { userProfile, isProfileLoading } = useUser();

  React.useEffect(() => {
    // mockFetchStatus().then((res) => {
    //   setStatus(res.status);
    //   setReason(res.reason);
    // });
  }, []);

  const handleSubmit = async (data: any) => {
    setSubmitting(true);
    // const res = await mockSubmit(data);
    // setStatus(res.status);
    // setReason(res.reason);
    setSubmitting(false);
  };

  const handleRetry = () => {
    setStatus(APPLY_STATUS.NONE);
    setReason(undefined);
  };

  if (isProfileLoading) {
    return <LoadingPage message="Please wait" />;
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-6xl mx-auto">
          {status === APPLY_STATUS.NONE ? (
            <ApplyOrganizerForm onSubmit={handleSubmit} />
          ) : (
            <ApplicationStatus
              status={status}
              reason={reason}
              onRetry={
                status === APPLY_STATUS.REJECTED
                  ? () => {
                      setStatus(APPLY_STATUS.NONE);
                      setReason(undefined);
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
