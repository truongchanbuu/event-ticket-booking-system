import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { useAuth } from "@/app/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { UserService } from "@/services/user.service";
import { useToast } from "@/hooks/use-toast"; // <-- BƯỚC 1: IMPORT useToast
import { UpdateUserData, AppUser } from "@/schema/user";
import { useEffect } from "react";
import { QUERY_KEYS } from "@/constants/user";

const REFETCH_TIME = 1000 * 60 * 5;
export const useUser = () => {
  const { user, isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = QUERY_KEYS.userProfile(user?.uid);

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error: profileError,
    isFetching,
  } = useQuery<AppUser | null>({
    queryKey,
    queryFn: () => UserService.getCurrentUserProfile().then((res) => res.data),
    enabled: Boolean(user),
    staleTime: REFETCH_TIME,
    retry: 1,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (profileError) {
      toast({
        variant: "destructive",
        title: "Failed to load your profile",
        description: "Cannot load your profile. Please try again later.",
      });
    }
  }, [profileError]);

  const updateProfileMutation = useMutation({
    mutationFn: (userData: UpdateUserData) =>
      UserService.updateUserProfile(userData),
    onMutate: async (newProfileData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousProfile = queryClient.getQueryData<AppUser>(queryKey);
      queryClient.setQueryData<AppUser | undefined>(queryKey, (old) =>
        old ? { ...old, ...newProfileData } : undefined
      );
      return { previousProfile };
    },
    onError: (error, newProfileData, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKey, context.previousProfile);
      }
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: "Cannot save your updates. Please try again later.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => UserService.deleteUserAccount(),
    onSuccess: async () => {
      toast({
        title: "Delete Successfully",
        description: "Your account has been deleted",
      });
      queryClient.removeQueries({ queryKey });
      await signOut(auth);
      queryClient.clear();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete account",
        description: "Failed to delete your account. Please try again later.",
      });
    },
  });

  return {
    userProfile,
    isProfileLoading,
    isFetching,
    isAuthLoading,
    profileError,

    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    updateProfileError: updateProfileMutation.error,

    deleteAccount: deleteAccountMutation.mutate,
    isDeletingAccount: deleteAccountMutation.isPending,
    deleteAccountError: deleteAccountMutation.error,

    refreshUserProfile: () => queryClient.invalidateQueries({ queryKey }),
  };
};
