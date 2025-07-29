"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Role } from "@/schema";
import ROLE, { RoleEnum } from "@/schema/enums/role";

type AuthContextType = {
  user: User | null;
  role?: Role;
  isAuthLoading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: undefined,
  isAuthLoading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [isAuthLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const userRole = tokenResult.claims.role;
        const parsedRole = RoleEnum.safeParse(userRole);
        setRole(parsedRole.success ? parsedRole.data : undefined);
        console.log(tokenResult);
      } else {
        setUser(null);
        setRole(undefined);
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
      isAdmin: role === ROLE.ADMIN,
    }),
    [user, role, isAuthLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
