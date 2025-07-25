import { create } from "zustand";
import { AppUser, UpdateUserData } from "@/schema/user";
import { User as FirebaseUser } from "firebase/auth";

interface UserState {
  // State
  firebaseUser: FirebaseUser | null;
  userProfile: AppUser | null;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  isProfileLoading: boolean;
  isProfileReady: boolean;

  updateProfile: (data: UpdateUserData) => void;
  deleteAccount: () => void;
  refreshUserProfile: () => void;

  _setAll: (data: Partial<UserState>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  // Initial state
  firebaseUser: null,
  userProfile: null,
  isLoggedIn: false,
  isAuthLoading: true,
  isProfileLoading: false,
  isProfileReady: false,

  // Các action ban đầu là rỗng, sẽ được provider ghi đè
  updateProfile: () => console.warn("updateProfile not initialized"),
  deleteAccount: () => console.warn("deleteAccount not initialized"),
  refreshUserProfile: () => console.warn("refreshUserProfile not initialized"),

  // Hàm nội bộ để provider cập nhật store
  _setAll: (data) => set(data),
}));
