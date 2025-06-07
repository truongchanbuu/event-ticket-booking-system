"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import toast from "react-hot-toast"

import { LoginFormProps } from "@/types/auth/auth"
import { loginWithEmail } from "@/lib/auth/firebase/auth.service"
import { LoginFormData, loginSchema } from "@/lib/validators/validator"

import AuthButton from "../ui/AuthButton"
import InputField from "./InputField"

interface LoginFormComponentProps extends LoginFormProps {
  onForgotPassword?: () => void
}

export default function LoginForm({
  onSubmit = loginWithEmail,
  onForgotPassword,
}: LoginFormComponentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  const loading = isSubmitting

  const handleFormSubmit: SubmitHandler<LoginFormData> = async (data) => {
    try {
      setIsSubmitting(true)
      clearErrors()

      if (onSubmit) {
        await onSubmit(data)
      }
      toast.success("Login successful! Redirecting...")
      router.push("/")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.field) {
        setError(error.field as keyof LoginFormData, {
          message: error.message,
        })
      } else {
        setError("root", {
          message: error.message || "An error occurred during login.",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col justify-center items-center"
    >
      <h2 className="text-xl font-semibold mb-3">Login</h2>
      <section className="mb-2 w-full">
        <InputField
          {...register("email")}
          placeholder="Email"
          type="email"
          disabled={loading}
          aria-invalid={errors.email ? true : false}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={
            errors.email
              ? "border-red-500 bg-red-50 red-500"
              : "border-gray-300"
          }
        />
        {errors.email && (
          <p id="email-error" className="text-red-500 text-sm" role="alert">
            {errors.email.message}
          </p>
        )}
      </section>
      <section className="mb-2 w-full">
        <InputField
          {...register("password")}
          placeholder="Password"
          type="password"
          disabled={loading}
          autoComplete="current-password"
          className={
            errors.password
              ? "border-red-500 bg-red-50 red-500"
              : "border-gray-300"
          }
        />
        {errors.password && (
          <p
            id="password-error"
            className="text-red-500 text-sm mb-2"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
      </section>
      <section className="w-full flex items-center justify-between mb-4">
        <label
          className="flex items-center justify-center gap-2 text-base text-gray-700 whitespace-nowrap"
          htmlFor="rememberMe"
        >
          <InputField
            {...register("rememberMe")}
            id="rememberMe"
            type="checkbox"
            className="accent-blue-500"
            keepDefault={false}
          />
          Remember me
        </label>

        <p
          className="text-base text-blue-500 cursor-pointer"
          onClick={onForgotPassword}
        >
          Forgot password?
        </p>
      </section>

      <AuthButton loading={loading} label="Login" />
      {errors.root?.message && (
        <p className="mr-auto text-red-500 text-sm" role="alert">
          {errors.root.message}
        </p>
      )}
    </form>
  )
}
