import { useState, useCallback } from "react";
import { signInSchema, emailSchema, passwordSchema } from "@/schema/auth";
import {
  signUpFormSchema,
  usernameSchema,
  signUpPasswordSchema,
} from "@/schema/auth/signup.schema";
import { z } from "zod";

interface UseAuthFormProps {
  initialData?: Record<string, any>;
}

export const useAuthForm = ({ initialData = {} }: UseAuthFormProps = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;

      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      // Clear field error when user starts typing
      setErrors((prev) => {
        if (prev[name]) {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        }
        return prev;
      });
    },
    []
  );

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      // Validate single field on blur using individual schemas
      try {
        if (name === "email") {
          emailSchema.parse(value);
        } else if (name === "password") {
          // Use signUpPasswordSchema for signup form, passwordSchema for signin
          const currentPasswordSchema = formData.username
            ? signUpPasswordSchema
            : passwordSchema;
          currentPasswordSchema.parse(value);
        } else if (name === "username") {
          usernameSchema.parse(value);
        } else if (name === "confirmPassword") {
          // Check if passwords match
          if (formData.password && value && formData.password !== value) {
            setErrors((prev) => ({
              ...prev,
              [name]: "Passwords do not match",
            }));
            return;
          }
        }

        // Clear error if validation passes
        setErrors((prev) => {
          if (prev[name]) {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          }
          return prev;
        });
      } catch (error: any) {
        // Set field error
        const errorMessage = error.errors?.[0]?.message || "Invalid input";
        setErrors((prev) => ({
          ...prev,
          [name]: errorMessage,
        }));
      }
    },
    [formData]
  );

  const setFieldValue = useCallback((name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  const setFormErrors = useCallback((newErrors: Record<string, string>) => {
    setErrors(newErrors);
  }, []);

  const validateSignIn = useCallback(() => {
    try {
      signInSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const validationErrors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          validationErrors[err.path[0]] = err.message;
        });
      }
      setErrors(validationErrors);
      return false;
    }
  }, [formData]);

  const validateSignUp = useCallback(() => {
    try {
      signUpFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const validationErrors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          validationErrors[err.path[0]] = err.message;
        });
      }
      setErrors(validationErrors);
      return false;
    }
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setIsLoading(false);
  }, [initialData]);

  return {
    formData,
    errors,
    isLoading,
    setIsLoading,
    handleInputChange,
    handleInputBlur,
    setFieldValue,
    clearErrors,
    setFieldError,
    setFormErrors,
    validateSignIn,
    validateSignUp,
    resetForm,
  };
};
