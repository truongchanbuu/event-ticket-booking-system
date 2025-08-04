"use client";

import React, { useEffect } from "react";
import LoadingPage from "@/components/app-loading";
import { Sparkles } from "lucide-react";
import { APP_NAME } from "@/constants/app";
import { AUTH_MESSAGES } from "@/constants/auth";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/hooks/user-store-hooks";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthLoading, isLoggedIn } = useAuthStatus();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/");
    }
  }, [isLoggedIn, router]);

  if (isAuthLoading) {
    return (
      <LoadingPage
        message={AUTH_MESSAGES.CHECK_PROFILE.LOADING}
        subMessage={AUTH_MESSAGES.CHECK_PROFILE.SUB_LOADING}
      />
    );
  }

  if (isLoggedIn) {
    return (
      <LoadingPage
        message={AUTH_MESSAGES.REDIRECTING.LOADING}
        subMessage={AUTH_MESSAGES.REDIRECTING.SUB_LOADING}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {APP_NAME}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>
    </div>
  );
}
