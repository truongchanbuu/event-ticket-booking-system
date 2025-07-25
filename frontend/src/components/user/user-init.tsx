"use client";

import { useUser } from "@/hooks/use-user";
import { useUserStore } from "@/store/user.store";
import { useEffect } from "react";

export const UserStoreInitializer = () => {
  const userData = useUser({ needFetchProfile: true });
  const { _setAll } = useUserStore();

  useEffect(() => {
    _setAll(userData);
  }, [userData, _setAll]);

  return null;
};
