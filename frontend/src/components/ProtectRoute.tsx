"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import LoadingPage from "./app-loading";
import { User } from "firebase/auth";
import { Role } from "@/schema";
import ROLE from "@/schema/enums/role";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  allowedRoles = ["customer"],
}: ProtectedRouteProps) {
  const { user, isAuthLoading, role } = useAuth();
  const router = useRouter();

  const userHasRequiredRole = checkAccess(user, role);
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.replace("/auth");
    } else if (!userHasRequiredRole) {
      router.replace("/unauthorized");
    }
  }, [isAuthLoading, user, role, allowedRoles, router]);

  if (isAuthLoading) {
    return <LoadingPage />;
  }

  if (!user || !userHasRequiredRole) {
    return null;
  }

  return <>{children}</>;
}

function checkAccess(
  user: User | null,
  role?: Role,
  allowedRoles?: Role[]
): boolean {
  if (!user || !role) return false;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return role === ROLE.ADMIN || allowedRoles.includes(role);
}
