import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User as FirebaseUser } from "firebase/auth";
import { useAuth } from "@/app/providers/AuthProvider";
import { UserService } from "@/services/user.service";
import { useToast } from "@/hooks/use-toast";
import { UpdateUserData, AppUser, fromFirebaseUser } from "@/schema/user";
import { useEffect, useMemo, useCallback } from "react";
import { QUERY_KEYS } from "@/constants/user";
import { logout } from "@/services/auth.service";
import { applyOrganizer } from "@/lib/api";

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
  firebaseUser: FirebaseUser | null,
  forceData: any
): AppUser | null {
  if (!firebaseUser && !backendUser) {
    return null;
  }

  if (!firebaseUser) {
    return backendUser ? { ...backendUser, ...forceData } : null;
  }

  const fbPartial = fromFirebaseUser(firebaseUser);
  const merged = {
    ...fbPartial,
    ...(backendUser || {}),
    ...forceData,
  };

  const differentKeys: string[] = [];

  if (backendUser) {
    for (const key in backendUser) {
      const backendVal = backendUser[key as keyof AppUser];
      const fbVal = fbPartial[key as keyof AppUser];

      const isDifferent =
        typeof backendVal === "object"
          ? JSON.stringify(backendVal) !== JSON.stringify(fbVal)
          : backendVal !== fbVal;

      if (isDifferent) {
        differentKeys.push(key);
      }
    }

    if (differentKeys.length > 0) {
      console.log("✅ Các trường khác biệt với Firebase user:");
      differentKeys.forEach((key) => {
        console.log(
          `→ ${key}: backend=${JSON.stringify(backendUser[key as keyof AppUser])}, firebase=${JSON.stringify(fbPartial[key as keyof AppUser])}`
        );
      });
    } else {
      console.log("⚠️ Không có trường nào khác biệt với Firebase user.");
    }
  } else {
    console.log("⚠️ Không có backendUser.");
  }

  return merged;
}

export const useUser = (options?: { needFetchProfile?: boolean }) => {
  const { needFetchProfile = false } = options || {};
  const { user: firebaseUser, isAuthLoading, isAdmin, role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = useMemo(
    () => QUERY_KEYS.userProfile(firebaseUser?.uid),
    [firebaseUser?.uid]
  );

  const cached =
    queryClient.getQueryData<UserProfileResponse>(queryKey) || EMPTY_PROFILE;

  const shouldFetch = Boolean(firebaseUser?.uid) && !cached.data?.role;
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
    if (needFetchProfile && firebaseUser?.uid) refetch();
  }, [needFetchProfile, firebaseUser?.uid, refetch]);

  const isLoggedIn = Boolean(firebaseUser);
  const isNewUser = fetched.meta?.isNew;

  const userProfile = useMemo(
    () => mergeProfile(fetched.data, firebaseUser ?? null, { role }),
    [fetched.data, firebaseUser, role]
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
        variant: "success",
        title: "Save Successfully",
        description: "Your account has been changed",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => UserService.deleteUserAccount(),
    onSuccess: async () => {
      toast({
        variant: "success",
        title: "Delete Successfully",
        description: "Your account has been deleted",
      });
      queryClient.removeQueries({ queryKey });
      await logout();
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

  const applyOrganizerMutation = useMutation({
    mutationFn: (data: any) => applyOrganizer(data),
    onSuccess: (data) => {
      toast({
        variant: "success",
        title: "Save successfully",
        description:
          "Application submitted successfully! We will review it shortly.",
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error("Submission process failed:", error);
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: `An error occurred during submission. Please try again. \nError: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    },
  });

  return useMemo(
    () => ({
      // Auth-derived
      firebaseUser,
      isAuthLoading,
      isLoggedIn,
      isAdmin,
      role,

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
      updateProfile: updateProfileMutation.mutateAsync,
      isUpdatingProfile: updateProfileMutation.isPending,

      deleteAccount: deleteAccountMutation.mutateAsync,
      isDeletingAccount: deleteAccountMutation.isPending,

      applyAsOrganizer: applyOrganizerMutation.mutateAsync,
      isApplyingOrganizer: applyOrganizerMutation.isPending,

      // Manual refresh
      refetchUserProfile: refetch,
    }),
    [
      firebaseUser,
      isAuthLoading,
      isLoggedIn,
      isAdmin,
      role,
      userProfile,
      hasDBProfile,
      hasRole,
      isProfileReady,
      isProfileLoading,
      isFetching,
      profileError,
      updateProfileMutation.mutateAsync,
      updateProfileMutation.isPending,
      deleteAccountMutation.mutateAsync,
      deleteAccountMutation.isPending,
      applyOrganizerMutation.mutateAsync,
      applyOrganizerMutation.isPending,
      refetch,
    ]
  );
};
