import React, { useState, useCallback } from "react";
import { useAuthForm } from "@/hooks/use-auth-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Mail, Phone, Sparkles, User } from "lucide-react";
import { InputField } from "./input-field";
import { PasswordField } from "./password-field";
import { Label } from "../ui/label";
import { LoadingSpinner } from "./loading-spinner";
import { APP_NAME } from "@/constants/app";

interface SignUpFormProps {
  onSubmit: (formData: any) => Promise<void>;
  setCurrentView: (view: "signin" | "signup") => void;
  error: string | null;
  isLoading: boolean;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSubmit,
  setCurrentView,
  error,
  isLoading,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    formData,
    errors,
    handleInputChange,
    handleInputBlur,
    validateSignUp,
  } = useAuthForm({
    initialData: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: undefined,
      birthday: undefined,
      agreeToTerms: false,
    },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (validateSignUp()) {
        await onSubmit(formData);
      }
    },
    [formData, onSubmit, validateSignUp]
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Join {APP_NAME}
            </h2>
            <p className="text-gray-600">
              Create your account to book amazing events
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              icon={User}
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              error={errors.username}
              disabled={isLoading}
            />

            <InputField
              icon={Mail}
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              error={errors.email}
              disabled={isLoading}
            />

            <PasswordField
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              showPassword={showPassword}
              toggleShow={() => setShowPassword(!showPassword)}
              error={errors.password}
              disabled={isLoading}
            />

            <PasswordField
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              showPassword={showConfirmPassword}
              toggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              error={errors.confirmPassword}
              disabled={isLoading}
            />

            <InputField
              icon={Phone}
              type="tel"
              name="phone"
              placeholder="Phone number (optional)"
              value={formData.phone}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              required={false}
              error={errors.phone}
              disabled={isLoading}
            />

            <InputField
              icon={Calendar}
              type="date"
              name="birthday"
              placeholder="Birthday (optional)"
              value={formData.birthday}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              required={false}
              error={errors.birthday}
              disabled={isLoading}
            />

            <Label className="flex items-start space-x-2">
              <Input
                type="checkbox"
                checked={formData.agreeToTerms}
                name="agreeToTerms"
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-600">
                I agree to the{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Privacy Policy
                </a>
              </span>
            </Label>
            {errors.agreeToTerms && (
              <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
            )}

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <div className="flex items-center justify-center">
                  <span>Create Account</span>
                  <Sparkles className="ml-2 h-4 w-4" />
                </div>
              )}
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => setCurrentView("signin")}
                className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                type="button"
                disabled={isLoading}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
