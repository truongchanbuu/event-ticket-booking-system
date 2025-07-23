import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateUserData, UpdateUserSchema, AppUser } from "@/schema/user";

const getDefaults = (user) => ({
  username: user?.username || "",
  email: user?.email || "",
  phoneNumber: user?.phoneNumber || "",
  birthday: user?.birthday || "",
});

export function useUserProfileForm(userData: AppUser | null) {
  const { reset, register, handleSubmit, formState } = useForm<UpdateUserData>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: getDefaults(userData),
  });

  useEffect(() => {
    if (userData) {
      reset(getDefaults(userData));
    }
  }, [userData, reset]);

  return {
    register,
    handleSubmit,
    formState,
    reset,
  };
}
