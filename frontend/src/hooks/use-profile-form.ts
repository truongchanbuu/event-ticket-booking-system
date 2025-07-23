import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppUser, UpdateUserData, UpdateUserSchema } from "@/schema/user";
import { getChangedFields } from "@/lib/helpers/object.helper";

// ----- HÀM HELPER (Đã đúng, giữ nguyên) -----
const formatUserForForm = (user: AppUser | null): UpdateUserData => {
  if (!user) {
    return {
      username: "",
      email: "",
      phoneNumber: "",
      birthday: "",
      preferenceCategories: [],
      photoUrl: "",
    };
  }
  const formattedBirthday = user.birthday
    ? new Date(user.birthday).toISOString().split("T")[0]
    : "";

  return {
    username: user.username ?? "",
    email: user.email ?? "",
    phoneNumber: user.phoneNumber ?? "",
    birthday: formattedBirthday,
    preferenceCategories: user.preferenceCategories ?? [],
    photoUrl: user.photoUrl ?? "",
  };
};

// ----- HOOK CHÍNH (PHIÊN BẢN SỬA LỖI TRIỆT ĐỂ) -----
interface UseProfileFormProps {
  userProfile: AppUser | null;
  updateProfile: (data: Partial<UpdateUserData>) => void;
}

export const useProfileForm = ({
  userProfile,
  updateProfile,
}: UseProfileFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<UpdateUserData>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: formatUserForForm(userProfile),
    mode: "onChange",
  });

  const handleEdit = useCallback(() => {
    reset(formatUserForForm(userProfile));
    setIsEditing(true);
  }, [userProfile, reset]);

  const handleSave = useCallback(
    (formData: UpdateUserData) => {
      console.log("[HANDLE_SAVE] START");
      console.log("[FORM DATA]:", formData);

      if (!userProfile) {
        console.warn("[HANDLE_SAVE] No userProfile, aborting.");
        return;
      }

      const initialData = formatUserForForm(userProfile);
      console.log("[INITIAL DATA]:", initialData);

      let changedFields = getChangedFields(initialData, formData);
      console.log("[CHANGED FIELDS BEFORE BIRTHDAY FIX]:", changedFields);

      // Chuyển đổi birthday nếu thay đổi
      if (changedFields.birthday) {
        changedFields = {
          ...changedFields,
          birthday: new Date(changedFields.birthday).toISOString(),
        };
        console.log("[CHANGED FIELDS AFTER BIRTHDAY FIX]:", changedFields);
      }

      if (Object.keys(changedFields).length > 0) {
        console.log("[UPDATE PROFILE CALLED WITH]:", changedFields);
        updateProfile(changedFields);
      } else {
        console.log("[NO CHANGES] Nothing to update.");
      }

      setIsEditing(false);
      console.log("[HANDLE_SAVE] DONE");
    },
    [userProfile, updateProfile]
  );

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    if (userProfile) {
      reset(formatUserForForm(userProfile));
    }
  }, [userProfile, reset]);

  const handlePreferencesChange = useCallback(
    (selections: string[]) => {
      setValue("preferenceCategories", [...selections], {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
    },
    [setValue]
  );

  const handleAvatarUpload = useCallback(
    async (newUrl: string) => {
      if (isEditing) {
        setValue("photoUrl", newUrl, { shouldDirty: true });
      } else {
        if (!userProfile) return;
        try {
          updateProfile({ photoUrl: newUrl });
        } catch (err) {
          console.error("Failed to update avatar:", err);
        }
      }
    },
    [isEditing, userProfile, updateProfile, setValue]
  );

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const watchedValues = watch();
  const currentData = useMemo(() => {
    if (!userProfile) return null;
    return isEditing ? { ...userProfile, ...watchedValues } : userProfile;
  }, [isEditing, userProfile, watchedValues]);

  return {
    isEditing,
    currentData,
    hasChanges: isDirty,
    errors,
    isModalOpen,
    handleEdit,
    handleSave: handleSubmit(handleSave),
    handleCancel,
    handlePreferencesChange,
    handleAvatarUpload,
    openModal,
    closeModal,
    register,
  };
};
