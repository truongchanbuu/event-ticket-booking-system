import React from "react";
import { APPLY_STATUS } from "@/src/schema/enums/apply-status";
import ApplyOrganizerForm, {
  OrganizerType,
} from "@/src/components/organizer/ApplyOrganizerForm";
import ApplicationStatus from "@/src/components/organizer/ApplicationStatus";

const mockFetchStatus = async (): Promise<{
  status: APPLY_STATUS | "none";
  reason?: string;
}> => {
  // TODO: Replace with real API call
  return { status: "none" };
};

const mockSubmit = async (
  data: any
): Promise<{ status: APPLY_STATUS; reason?: string }> => {
  // TODO: Replace with real API call
  await new Promise((r) => setTimeout(r, 1200));
  return { status: APPLY_STATUS.PENDING };
};

const ApplyOrganizerPage: React.FC = () => {
  const [status, setStatus] = React.useState<APPLY_STATUS | "none">("none");
  const [reason, setReason] = React.useState<string | undefined>(undefined);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    mockFetchStatus().then((res) => {
      setStatus(res.status);
      setReason(res.reason);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (data: any) => {
    setSubmitting(true);
    const res = await mockSubmit(data);
    setStatus(res.status);
    setReason(res.reason);
    setSubmitting(false);
  };

  const handleRetry = () => {
    setStatus("none");
    setReason(undefined);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <span className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full block" />
      </div>
    );
  }

  return (
    <div className="py-10 px-4 min-h-[80vh] bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Đăng ký trở thành Event Organizer
      </h1>
      {status === "none" ? (
        <ApplyOrganizerForm onSubmit={handleSubmit} loading={submitting} />
      ) : (
        <ApplicationStatus
          status={status}
          reason={reason}
          onRetry={status === APPLY_STATUS.REJECTED ? handleRetry : undefined}
        />
      )}
    </div>
  );
};

export default ApplyOrganizerPage;
