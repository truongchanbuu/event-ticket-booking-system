// TODO: Cần tìm cách thực hiện cập nhật emailVerified & status ở Firestore

"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, X, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProfileManagement } from "@/hooks/user-store-hooks";
import { USER_STATUS } from "@/schema";

type Status =
  | "verifying"
  | "success"
  | "error"
  | "expired"
  | "invalid"
  | "invalid_mode";

export default function EmailVerificationHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [autoRedirect, setAutoRedirect] = useState(true);

  const oobCode = params.get("oobCode");
  const mode = params.get("mode");

  const { updateProfile } = useProfileManagement();

  useEffect(() => {
    if (!oobCode || mode !== "verifyEmail") {
      setStatus("invalid_mode");
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const handleVerification = async () => {
      try {
        setStatus("verifying");
        await applyActionCode(auth, oobCode);

        // Sau khi applyActionCode thành công, chúng ta không gọi updateProfile ngay.
        // Thay vào đó, chúng ta lắng nghe sự thay đổi trạng thái xác thực.
        // Firebase sẽ tự động kích hoạt listener này khi email được xác thực.

        unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user && user.emailVerified) {
            // Đã có người dùng và email đã được xác thực!
            // Bây giờ là thời điểm an toàn để gọi updateProfile.
            setStatus("success");
            try {
              await updateProfile({
                emailVerified: true,
                status: USER_STATUS.ACTIVE,
              });
            } catch (profileError) {
              // Xử lý lỗi nếu việc cập nhật profile thất bại
              console.error("Failed to update profile:", profileError);
              setStatus("error");
              setErrorMessage("Email verified, but failed to update profile.");
            }

            // Hủy đăng ký listener sau khi đã hoàn thành công việc
            // để tránh rò rỉ bộ nhớ và các lần gọi không cần thiết.
            if (unsubscribe) {
              unsubscribe();
            }
          }
        });
      } catch (err: any) {
        // Hủy listener nếu có lỗi xảy ra trong quá trình applyActionCode
        if (unsubscribe) {
          unsubscribe();
        }
        const code = err.code;
        if (code === "auth/expired-action-code") {
          setStatus("expired");
          setErrorMessage("Link has been expired. Please re-try.");
        } else if (code === "auth/invalid-action-code") {
          setStatus("invalid");
          setErrorMessage("Invalid or used link.");
        } else {
          setStatus("error");
          setErrorMessage("Failed to verify. Please try again later.");
        }
      }
    };

    handleVerification();

    // Đây là hàm dọn dẹp (cleanup function) của useEffect.
    // Nó sẽ được gọi khi component bị unmount.
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [oobCode, mode, updateProfile]); // Thêm updateProfile vào dependency array

  useEffect(() => {
    let timer: any;
    if (status === "success" && autoRedirect && countdown > 0) {
      timer = setTimeout(() => {
        if (countdown === 1) router.replace("/");
        else setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [status, countdown, autoRedirect, router]);

  // Render functions ...

  /** Functions for buttons **/
  const handleRetry = () =>
    oobCode && setStatus("verifying") && void 0 && window.location.reload();
  const handleRequestNewLink = () => router.push("/auth");
  const handleGoHome = () => router.replace("/");
  const handleContactSupport = () => window.open("/support", "_blank");
  const handleClose = () =>
    window.history.length > 1 ? router.back() : router.replace("/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={handleGoHome}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">
            Email Verification
          </h1>
          <Button variant="ghost" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {status === "verifying" ? (
            <div className="text-center space-y-6">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
              <h2 className="text-2xl font-bold">Verifying Your Email</h2>
              <p className="text-gray-600">
                Please wait while we verify your email address...
              </p>
            </div>
          ) : status === "success" ? (
            <div className="text-center space-y-6">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">
                Email Verified Successfully!
              </h2>
              <p className="text-gray-600">
                Your account is now active. Redirecting in {countdown}s...
              </p>
              <Button
                onClick={handleGoHome}
                className="w-full bg-green-600 text-white py-3 rounded-lg"
              >
                Go Home
              </Button>
              <Button
                onClick={() => setAutoRedirect((a) => !a)}
                className="w-full bg-white border text-gray-700 py-2 rounded-lg"
              >
                {autoRedirect ? "Cancel Auto‑Redirect" : "Enable Auto‑Redirect"}
              </Button>
            </div>
          ) : (
            // error / invalid / expired mode
            <div className="text-center space-y-6">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
              <h2 className="text-2xl font-bold">Verification Failed</h2>
              <p className="text-gray-600">
                {errorMessage || "Unable to verify your email."}
              </p>
              {status === "expired" || status === "invalid" ? (
                <Button
                  onClick={handleRequestNewLink}
                  className="w-full text-white py-3 rounded-lg"
                >
                  Request New Link
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleRetry}
                  className="w-full text-white py-3 rounded-lg"
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={handleGoHome}
                className="w-full bg-white border text-gray-700 py-2 rounded-lg"
              >
                Home
              </Button>
              <Button
                onClick={handleContactSupport}
                className="w-full bg-white border text-gray-700 py-2 rounded-lg"
              >
                Contact Support
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
