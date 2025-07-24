"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, signInWithGoogle } from "@/services/auth.service";
import { useAuthHandler } from "@/hooks/use-auth-handler";

import LoadingPage from "@/components/app-loading";
import { AUTH_MESSAGES } from "@/constants/auth";
import { SignInForm } from "@/components/auth/signin-form";
import { SignUpForm } from "@/components/auth/signup-form";

type Mode = "signin" | "signup";
const EventHubAuth = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialMode =
    searchParams?.get("mode") === "signup" ? "signup" : "signin";
  const [currentView, setCurrentView] = useState<Mode>(initialMode);

  const {
    isLoading,
    error,
    loadingMessage,
    loadingSubMessage,
    executeAuthAction,
    setError,
  } = useAuthHandler();

  useEffect(() => {
    setError(null);
  }, [currentView, setError]);

  const handleSignUp = useCallback(
    async (formData: any) => {
      const userData = {
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phone,
        birthday: formData.birthDay,
      };

      await executeAuthAction(
        () => signUp(formData.email, formData.password, userData),
        AUTH_MESSAGES.SIGN_UP
      );
    },
    [executeAuthAction]
  );

  const handleSignIn = useCallback(
    async (formData: any) => {
      const result = await executeAuthAction(
        () => signIn(formData.email, formData.password),
        AUTH_MESSAGES.SIGN_IN
      );

      if (result) {
        router.push("/");
      }
    },
    [executeAuthAction, router]
  );

  const handleGoogleSignIn = useCallback(async () => {
    const result = await executeAuthAction(
      () => signInWithGoogle(),
      AUTH_MESSAGES.GOOGLE_SIGN_IN
    );

    if (result) {
      router.push("/");
    }
  }, [executeAuthAction, router]);

  if (isLoading) {
    return (
      <LoadingPage message={loadingMessage} subMessage={loadingSubMessage} />
    );
  }

  return currentView === "signin" ? (
    <SignInForm
      onSubmit={handleSignIn}
      handleGoogleSignIn={handleGoogleSignIn}
      setCurrentView={setCurrentView}
      error={error}
      isLoading={isLoading}
    />
  ) : (
    <SignUpForm
      onSubmit={handleSignUp}
      setCurrentView={setCurrentView}
      error={error}
      isLoading={isLoading}
    />
  );
};

export default EventHubAuth;
