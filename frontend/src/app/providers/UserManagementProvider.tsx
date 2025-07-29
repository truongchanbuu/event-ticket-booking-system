"use client";

import { useUser } from "@/hooks/use-user";
import { useUserStore } from "@/store/user.store";
import React, { useEffect } from "react";

/**
 * Provider này đóng vai trò là cầu nối giữa hook `useUser` (sử dụng React Query)
 * và store Zustand toàn cục (`useUserStore`).
 *
 * Nó gọi `useUser` để lấy tất cả dữ liệu, trạng thái và các hàm mutation,
 * sau đó sử dụng `useEffect` để đồng bộ hóa chúng vào Zustand store.
 *
 * Nhờ vậy, các component khác chỉ cần tương tác với `useUserStore`
 * mà không cần biết về sự phức tạp của việc fetch dữ liệu bên dưới.
 */
export function UserManagementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const userHookData = useUser();
  const { _setAll } = useUserStore();

  useEffect(() => {
    _setAll({
      firebaseUser: userHookData.firebaseUser,
      isAuthLoading: userHookData.isAuthLoading,
      isLoggedIn: userHookData.isLoggedIn,
      role: userHookData.role,

      userProfile: userHookData.userProfile,

      isProfileReady: userHookData.isProfileReady,
      isProfileLoading: userHookData.isProfileLoading,
      isFetching: userHookData.isFetching,

      isUpdatingProfile: userHookData.isUpdatingProfile,
      isDeletingAccount: userHookData.isDeletingAccount,
      isApplyingOrganizer: userHookData.isApplyingOrganizer,

      updateProfile: userHookData.updateProfile,
      deleteAccount: userHookData.deleteAccount,
      applyOrganizer: userHookData.applyAsOrganizer,
      refreshUserProfile: userHookData.refetchUserProfile,
    });
  }, [userHookData, _setAll]); // Chạy lại effect khi dữ liệu từ hook thay đổi

  return <>{children}</>;
}
