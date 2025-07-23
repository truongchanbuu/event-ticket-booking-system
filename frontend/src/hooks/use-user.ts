import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut, User as FirebaseUser } from "firebase/auth";
import { useAuth } from "@/app/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { UserService } from "@/services/user.service";
import { useToast } from "@/hooks/use-toast";
import { UpdateUserData, AppUser, fromFirebaseUser } from "@/schema/user";
import { useEffect, useMemo, useCallback } from "react";
import { QUERY_KEYS } from "@/constants/user";

type UserProfileResponse = {
  data: AppUser | null;
  meta: { isNew: boolean };
};

const REFETCH_TIME = 0;
const EMPTY_PROFILE: UserProfileResponse = {
  data: null,
  meta: { isNew: false },
};
const MAX_RETRY = 3;

/**
 * Merge backend AppUser (if any) with firebaseUser fallback.
 * Backend wins. Only fills undefined fields from Firebase.
 */
function mergeProfile(
  backendUser: AppUser | null | undefined,
  firebaseUser: FirebaseUser | null
): AppUser | null {
  if (!firebaseUser && !backendUser) {
    return null;
  }

  if (!firebaseUser) {
    return backendUser ?? null;
  }

  const fbPartial = fromFirebaseUser(firebaseUser);
  if (!backendUser) {
    return fbPartial as unknown as AppUser;
  }

  const merged = { ...fbPartial, ...backendUser };
  return merged;
}

export const useUser = (options?: { needFetchProfile?: boolean }) => {
  const { needFetchProfile = false } = options || {};
  const { user: firebaseUser, isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = useMemo(
    () => QUERY_KEYS.userProfile(firebaseUser?.uid),
    [firebaseUser?.uid]
  );

  const cached =
    queryClient.getQueryData<UserProfileResponse>(queryKey) || EMPTY_PROFILE;

  const shouldFetch = Boolean(firebaseUser) && !cached.data?.role;

  const {
    data: fetched = cached,
    isLoading: isProfileLoading,
    error: profileError,
    isFetching,
    refetch,
  } = useQuery<UserProfileResponse>({
    queryKey,
    queryFn: async () => {
      const res = await UserService.getCurrentUserProfile();
      const full = res.data;
      return {
        data: full,
        meta: { isNew: full.isNew },
      };
    },
    enabled: shouldFetch,
    staleTime: REFETCH_TIME,
    retry: MAX_RETRY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: cached,
    placeholderData: cached,
  });

  useEffect(() => {
    if (needFetchProfile && firebaseUser) refetch();
  }, [needFetchProfile, firebaseUser, refetch]);

  const isLoggedIn = Boolean(firebaseUser);
  const isNewUser = fetched.meta?.isNew;

  const userProfile = useMemo(
    () => mergeProfile(fetched.data, firebaseUser ?? null),
    [fetched.data, firebaseUser]
  );

  const hasDBProfile = Boolean(fetched.data);
  const hasRole = Boolean(userProfile?.role);
  const isProfileReady = isLoggedIn && hasRole;

  useEffect(() => {
    if (isNewUser && firebaseUser) {
      firebaseUser.getIdToken(true).then(() => {
        queryClient.invalidateQueries({ queryKey });
      });
    }
  }, [isNewUser, firebaseUser, queryClient, queryKey]);

  useEffect(() => {
    if (profileError && isLoggedIn) {
      toast({
        variant: "destructive",
        title: "Failed to load your profile",
        description: "Cannot load your profile. Please try again later.",
      });
    }
  }, [profileError, isLoggedIn, toast]);

  /* ---------------- Mutations ---------------- */
  const updateProfileMutation = useMutation({
    mutationFn: (userData: UpdateUserData) =>
      UserService.updateUserProfile(userData),
    onMutate: async (newProfileData) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<UserProfileResponse>(queryKey);

      if (prev) {
        queryClient.setQueryData<UserProfileResponse>(queryKey, {
          ...prev,
          data: prev.data ? { ...prev.data, ...newProfileData } : prev.data,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      console.error(_err);
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: "Cannot save your updates. Please try again later.",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Save Successfully",
        description: "Your account has been changed",
      });
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
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to delete account",
        description: "Failed to delete your account. Please try again later.",
      });
    },
  });

  const refreshUserProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return useMemo(
    () => ({
      // Auth-derived
      firebaseUser,
      isAuthLoading,
      isLoggedIn,

      // Profile (merged)
      userProfile,
      hasDBProfile,
      hasRole,
      isProfileReady,

      // Query state
      isProfileLoading,
      isFetching,
      profileError,

      // Mutations
      updateProfile: updateProfileMutation.mutate,
      isUpdatingProfile: updateProfileMutation.isPending,

      deleteAccount: deleteAccountMutation.mutate,
      isDeletingAccount: deleteAccountMutation.isPending,

      // Manual refresh
      refreshUserProfile,
    }),
    [
      firebaseUser,
      isAuthLoading,
      isLoggedIn,
      userProfile,
      hasDBProfile,
      hasRole,
      isProfileReady,
      isProfileLoading,
      isFetching,
      profileError,
      updateProfileMutation.mutate,
      updateProfileMutation.isPending,
      deleteAccountMutation.mutate,
      deleteAccountMutation.isPending,
      refreshUserProfile,
    ]
  );
};
