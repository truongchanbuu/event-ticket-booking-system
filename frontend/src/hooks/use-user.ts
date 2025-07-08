import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/providers/AuthProvider";
import { UserService, UpdateUserData } from "@/services/user.service";

export const useUser = () => {
  const { user } = useAuth();

  const {
    data: userProfile,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["userProfile", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const profile = await UserService.getCurrentUserProfile();
      return profile.data;
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const updateProfile = async (userData: UpdateUserData) => {
    const result = await UserService.updateUserProfile(userData);
    await refetch();
    return result;
  };

  const deleteAccount = async () => {
    const result = await UserService.deleteUserAccount();
    return result;
  };

  const clearError = () => {};

  return {
    userProfile,
    loading: isLoading || isFetching,
    error,
    updateProfile,
    deleteAccount,
    clearError,
    refreshUserProfile: refetch,
  };
};
