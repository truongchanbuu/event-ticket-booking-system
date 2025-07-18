"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User, getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserService } from "@/services/user.service";

type AuthContextType = {
  user: User | null;
  role: string | null;
  isAuthLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAuthLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAuthLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          // 1. Lấy claims hiện tại
          let tokenResult = await getIdTokenResult(firebaseUser);
          let currentRole = tokenResult.claims.role as string | undefined;

          if (!currentRole) {
            const res = await UserService.getCurrentUserProfile();
            if (res.data?.isNew) {
              await firebaseUser.getIdToken(true);
              tokenResult = await getIdTokenResult(firebaseUser);
              currentRole = tokenResult.claims.role as string | undefined;
            }
          }

          setRole(currentRole || null);
        } catch (err) {
          console.error("Error syncing role:", err);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthLoading,
    }),
    [user, role, isAuthLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
