import { applyOrganizer } from "@/lib/api";
import { useUserStore } from "@/store/user.store";
import { useMemo } from "react";

/**
 * Hook chỉ cung cấp các trạng thái liên quan đến xác thực và tải dữ liệu.
 * Lý tưởng cho việc xử lý các màn hình loading, redirect, hoặc bảo vệ route.
 * @returns {object} { isAuthLoading, isLoggedIn, isProfileLoading, isProfileReady }
 */
export const useAuthStatus = () => {
  const isAuthLoading = useUserStore((s) => s.isAuthLoading);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const isProfileLoading = useUserStore((s) => s.isProfileLoading);
  const isProfileReady = useUserStore((s) => s.isProfileReady);

  return useMemo(
    () => ({
      isAuthLoading,
      isLoggedIn,
      isProfileLoading,
      isProfileReady,
    }),
    [isAuthLoading, isLoggedIn, isProfileLoading, isProfileReady]
  );
};

/**
 * Hook chỉ cung cấp thông tin profile đầy đủ của người dùng đã đăng nhập.
 * @returns {AppUser | null} Đối tượng user profile hoặc null.
 */
export const useUserProfile = () => {
  const userProfile = useUserStore((state) => state.userProfile);
  return userProfile;
};

/**
 * Hook chỉ cung cấp các hàm (actions) để tương tác với state người dùng.
 * Vì các hàm này thường không thay đổi, component sử dụng hook này sẽ hiếm khi re-render.
 * @returns {object} { updateProfile, deleteAccount, refreshUserProfile }
 */
export const useUserActions = () => {
  const updateProfile = useUserStore((s) => s.updateProfile);
  const deleteAccount = useUserStore((s) => s.deleteAccount);
  const refreshUserProfile = useUserStore((s) => s.refreshUserProfile);

  return useMemo(
    () => ({
      updateProfile,
      deleteAccount,
      refreshUserProfile,
    }),
    [updateProfile, deleteAccount, refreshUserProfile]
  );
};

export const useProfileManagement = () => {
  const userProfile = useUserStore((s) => s.userProfile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const refetchProfile = useUserStore((s) => s.refreshUserProfile);
  const isProfileLoading = useUserStore((s) => s.isProfileLoading);
  const isFetching = useUserStore((s) => s.isFetching);
  const role = useUserStore((s) => s.role);

  return useMemo(
    () => ({
      userProfile,
      role,
      isProfileLoading,
      isFetching,
      updateProfile,
      refetchProfile,
    }),
    [
      userProfile,
      role,
      updateProfile,
      refetchProfile,
      isProfileLoading,
      isFetching,
    ]
  );
};

export const useOrganizerApply = () => {
  const isApplyingOrganizer = useUserStore((s) => s.isApplyingOrganizer);
  const applyOrganizer = useUserStore((s) => s.applyOrganizer);

  return useMemo(
    () => ({
      isApplyingOrganizer,
      applyOrganizer,
    }),
    [isApplyingOrganizer, applyOrganizer]
  );
};

/**
 * Hook nhỏ gọn chỉ để lấy vai trò (role) của người dùng.
 * Hữu ích cho việc kiểm soát quyền truy cập (RBAC).
 * @returns {string | undefined} Vai trò của người dùng hoặc undefined.
 */
export const useUserRole = () => {
  const role = useUserStore((state) => state.userProfile?.role);
  return role;
};
