import { useState, useCallback } from "react";
import { signInSchema, emailSchema, passwordSchema } from "@/schema/auth";
import {
  signUpFormSchema,
  usernameSchema,
  signUpPasswordSchema,
} from "@/schema/auth/signup.schema";

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

      setFormData((prev) => ({ ...prev, [name]: newValue }));

      // Validate realtime
      const schema = signInSchema[name];
      if (schema) {
        const result = schema.safeParse(newValue);
        if (!result.success) {
          setErrors((prev) => ({
            ...prev,
            [name]: result.error.errors[0]?.message || "Invalid input",
          }));
          return;
        }
      }

      // Clear error nếu hợp lệ
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
      const { name, value, type, checked } = e.target;
      const fieldValue = type === "checkbox" ? checked : value;

      // Lấy schema gốc để validate từng field
      const fieldSchema = signUpFormSchema[name];
      if (fieldSchema) {
        const result = fieldSchema.safeParse(fieldValue);
        if (!result.success) {
          setErrors((prev) => ({
            ...prev,
            [name]: result.error.errors[0]?.message || "Invalid input",
          }));
          return;
        }
      }

      // Special case: confirmPassword check
      if (name === "confirmPassword" && formData.password !== value) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
        return;
      }

      // Xóa lỗi nếu hợp lệ
      setErrors((prev) => {
        if (prev[name]) {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        }
        return prev;
      });
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
