import { useState } from "react";
import { UserService, UpdateUserData } from "@/services/user.service";
import { useAuth } from "@/app/providers/AuthProvider";

export const useUser = () => {
  const { userProfile, refreshUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (userData: UpdateUserData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await UserService.updateUserProfile(userData);
      await refreshUserProfile();
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await UserService.deleteUserAccount();
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete account";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    userProfile,
    loading,
    error,
    updateProfile,
    deleteAccount,
    clearError,
    refreshUserProfile,
  };
};
