import { create } from "zustand";
import { APPLY_STATUS } from "@/schema";

interface ApplyOrganizerState {
  status: APPLY_STATUS | "none";
  reason?: string;
  loading: boolean;
  submitting: boolean;
  setStatus: (status: APPLY_STATUS | "none", reason?: string) => void;
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

export const useApplyOrganizerStore = create<ApplyOrganizerState>((set) => ({
  status: "none",
  reason: undefined,
  loading: false,
  submitting: false,
  setStatus: (status, reason) => set({ status, reason }),
  setLoading: (loading) => set({ loading }),
  setSubmitting: (submitting) => set({ submitting }),
  reset: () =>
    set({
      status: "none",
      reason: undefined,
      loading: false,
      submitting: false,
    }),
}));
