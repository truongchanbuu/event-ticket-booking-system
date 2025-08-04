// src/stores/user.store.ts

import { create } from "zustand";
import { AppUser, UpdateUserData } from "@/schema/user";
import { User as FirebaseUser } from "firebase/auth";
import { Role } from "@/schema";

// Định nghĩa đầy đủ cho UserState để khớp với hook `useUser`
export interface UserState {
  // --- State & Dữ liệu ---
  firebaseUser: FirebaseUser | null;
  userProfile: AppUser | null;
  isLoggedIn: boolean;
  role?: Role;

  // --- Trạng thái Loading & Sẵn sàng ---
  isAuthLoading: boolean; // Loading từ Firebase Auth
  isProfileLoading: boolean; // Loading query ban đầu
  isFetching: boolean; // Đang refetch trong nền
  isProfileReady: boolean; // Đã có cả auth và profile

  // --- Trạng thái của các Mutations ---
  isUpdatingProfile: boolean;
  isDeletingAccount: boolean;
  isApplyingOrganizer: boolean;

  // --- Actions ---
  // Các hàm này sẽ được provider ghi đè bằng các hàm thật từ useMutation
  updateProfile: (data: UpdateUserData) => Promise<void>;
  deleteAccount: () => Promise<void>;
  applyOrganizer: (data: any) => Promise<any>;
  refreshUserProfile: () => Promise<void>;

  // Hàm nội bộ để Provider cập nhật toàn bộ state
  _setAll: (data: Partial<Omit<UserState, "_setAll">>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  // --- State & Dữ liệu ban đầu ---
  firebaseUser: null,
  userProfile: null,
  isLoggedIn: false,
  role: undefined,

  // --- Trạng thái Loading & Sẵn sàng ban đầu ---
  isAuthLoading: true,
  isProfileLoading: true,
  isFetching: false,
  isProfileReady: false,

  // --- Trạng thái Mutations ban đầu ---
  isUpdatingProfile: false,
  isDeletingAccount: false,
  isApplyingOrganizer: false,

  // Cung cấp các hàm rỗng để tránh lỗi nếu được gọi trước khi Provider kịp ghi đè
  updateProfile: async () => {
    console.warn("updateProfile was called before the UserProvider was ready.");
  },
  deleteAccount: async () => {
    console.warn("deleteAccount was called before the UserProvider was ready.");
  },
  applyOrganizer: async (data) => {
    console.warn(
      "applyOrganizer was called before the UserProvider was ready. Data:",
      data
    );
    return Promise.reject(new Error("User provider not initialized."));
  },
  refreshUserProfile: async () => {
    console.warn(
      "refreshUserProfile was called before the UserProvider was ready."
    );
  },

  // Hàm nội bộ để provider cập nhật store
  _setAll: (data) => set(data),
}));

// Tiện ích: Selector để chỉ lấy các actions, giúp tối ưu re-render
export const useUserActions = () =>
  useUserStore((state) => ({
    updateProfile: state.updateProfile,
    deleteAccount: state.deleteAccount,
    applyOrganizer: state.applyOrganizer,
    refreshUserProfile: state.refreshUserProfile,
  }));
