"use client";

import React, { useState } from "react";
import {
  Calendar,
  Phone,
  Mail,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { APP_NAME } from "@/constants/app";
import { useRouter } from "next/navigation";
import {
  signIn,
  signUp,
  signInWithGoogle,
  AuthError,
} from "@/services/auth.service";
import { useAuthForm } from "@/hooks/use-auth-form";
import LoadingPage from "@/components/app-loading";
import { SignUpForm } from "@/components/auth/signup-form";
import { SignInForm } from "@/components/auth/signin-form";
import { ApplyOrganizerForm, ApplicationStatus } from "@/components/organizer";
import { APPLY_STATUS, ORGANIZER_STATUS } from "@/schema";
import { useUser } from "@/hooks/use-user";

const EventHubAuth = () => {
  const [currentView, setCurrentView] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoadingPage, setShowLoadingPage] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingSubMessage, setLoadingSubMessage] = useState("");
  const [showApplyOrganizer, setShowApplyOrganizer] = useState(false);
  const [organizerStatus, setOrganizerStatus] = useState<APPLY_STATUS | "none">(
    "none"
  );
  const [organizerReason, setOrganizerReason] = useState<string | undefined>(
    undefined
  );
  const [organizerSubmitting, setOrganizerSubmitting] = useState(false);
  const [skipApply, setSkipApply] = useState(false);
  const router = useRouter();

  const {
    formData,
    errors,
    isLoading,
    setIsLoading,
    handleInputChange,
    handleInputBlur,
    clearErrors,
    validateSignIn,
    validateSignUp,
  } = useAuthForm({
    initialData: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      birthday: "",
    },
  });

  const { userProfile, loading: userLoading, refreshUserProfile } = useUser();

  const handleSignUp = async () => {
    clearErrors();
    setError(null);
    const signUpData = {
      ...formData,
      agreeToTerms,
    };
    if (!validateSignUp()) {
      return;
    }
    setIsLoading(true);
    setLoadingMessage("Creating your account...");
    setLoadingSubMessage("Setting up your profile and preferences");
    setShowLoadingPage(true);
    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phone,
      };
      await signUp(formData.email, formData.password, userData);
      setIsLoading(false);
      setShowLoadingPage(false);
      setShowApplyOrganizer(true);
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || "Sign up failed");
      setIsLoading(false);
      setShowLoadingPage(false);
    }
  };

  const handleSignIn = async () => {
    clearErrors();
    setError(null);

    const signInData = {
      ...formData,
      rememberMe,
    };

    if (!validateSignIn()) {
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Signing you in...");
    setLoadingSubMessage("Verifying your credentials");
    setShowLoadingPage(true);
    try {
      await signIn(formData.email, formData.password);
      setIsLoading(false);
      setShowLoadingPage(false);
      router.push("/");
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || "Sign in failed");
      setIsLoading(false);
      setShowLoadingPage(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearErrors();
    setError(null);
    setIsLoading(true);
    setLoadingMessage("Connecting with Google...");
    setLoadingSubMessage("Authenticating your Google account");
    setShowLoadingPage(true);
    try {
      await signInWithGoogle();
      setIsLoading(false);
      setShowLoadingPage(false);
      router.push("/");
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || "Google sign in failed");
      setIsLoading(false);
      setShowLoadingPage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentView === "signin") {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  };

  // Hiển thị LoadingPage khi đang thực hiện các hành động auth
  if (showLoadingPage) {
    return (
      <LoadingPage message={loadingMessage} subMessage={loadingSubMessage} />
    );
  }

  // Nếu user đã đăng nhập và chưa apply organizer, show UI apply organizer
  if (!showApplyOrganizer && userProfile && !userLoading && !skipApply) {
    // organizerStatus: none, rejected => cho apply
    const orgStatus =
      (userProfile.organizerStatus as string) || ORGANIZER_STATUS.NONE;
    if (
      orgStatus === ORGANIZER_STATUS.NONE ||
      orgStatus === ORGANIZER_STATUS.REJECTED
    ) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="w-full max-w-lg mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Event Organizer Registration
            </h2>
            <p className="mb-4 text-center text-gray-600">
              You need to complete event registration to fully access all
              features.
            </p>
            {organizerStatus === "none" ? (
              <ApplyOrganizerForm
                onSubmit={async (data) => {
                  setOrganizerSubmitting(true);
                  // TODO: Gọi API thật ở đây
                  await new Promise((r) => setTimeout(r, 1200));
                  setOrganizerStatus(APPLY_STATUS.PENDING);
                  setOrganizerSubmitting(false);
                  await refreshUserProfile();
                  // Nếu user đã được duyệt, ẩn UI apply organizer
                  if (
                    userProfile.organizerStatus === ORGANIZER_STATUS.APPROVED
                  ) {
                    setSkipApply(true);
                  }
                }}
                loading={organizerSubmitting}
              />
            ) : (
              <ApplicationStatus
                status={organizerStatus}
                reason={organizerReason}
                onRetry={
                  organizerStatus === APPLY_STATUS.REJECTED
                    ? () => {
                        setOrganizerStatus("none");
                        setOrganizerReason(undefined);
                      }
                    : undefined
                }
              />
            )}
            <button
              className="mt-6 w-full py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition"
              onClick={() => setSkipApply(true)}
            >
              Skip for now
            </button>
          </div>
        </div>
      );
    }
  }

  if (userProfile && !userLoading && skipApply) {
    router.replace("/events");
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
        <div className="w-full max-w-md">
          {currentView === "signin" ? (
            <SignInForm
              formData={formData}
              errors={errors}
              isLoading={isLoading}
              showPassword={showPassword}
              rememberMe={rememberMe}
              error={error}
              handleInputChange={handleInputChange}
              handleInputBlur={handleInputBlur}
              setShowPassword={setShowPassword}
              setRememberMe={setRememberMe}
              handleSubmit={handleSubmit}
              handleGoogleSignIn={handleGoogleSignIn}
              setCurrentView={setCurrentView}
            />
          ) : (
            <SignUpForm
              formData={formData}
              errors={errors}
              isLoading={isLoading}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              agreeToTerms={agreeToTerms}
              error={error}
              handleInputChange={handleInputChange}
              handleInputBlur={handleInputBlur}
              setShowPassword={setShowPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              setAgreeToTerms={setAgreeToTerms}
              handleSubmit={handleSubmit}
              setCurrentView={setCurrentView}
            />
          )}
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>
    </div>
  );
};

export default EventHubAuth;
