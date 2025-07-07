import { useCallback } from "react";
import { APPLY_STATUS } from "@/schema";
import { useApplyOrganizerStore } from "@/store/applyOrganizerStore";

export const useApplyOrganizer = () => {
  const {
    status,
    reason,
    loading,
    submitting,
    setStatus,
    setLoading,
    setSubmitting,
    reset,
  } = useApplyOrganizerStore();

  // Giả lập fetch trạng thái
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with real API call
    await new Promise((r) => setTimeout(r, 500));
    setStatus("none");
    setLoading(false);
  }, [setLoading, setStatus]);

  // Giả lập submit
  const submit = useCallback(
    async (data: any) => {
      setSubmitting(true);
      // TODO: Replace with real API call
      await new Promise((r) => setTimeout(r, 1200));
      setStatus(APPLY_STATUS.PENDING);
      setSubmitting(false);
    },
    [setSubmitting, setStatus]
  );

  const retry = useCallback(() => {
    reset();
  }, [reset]);

  return {
    status,
    reason,
    loading,
    submitting,
    fetchStatus,
    submit,
    retry,
  };
};

export default useApplyOrganizer;
