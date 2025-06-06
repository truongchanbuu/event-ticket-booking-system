"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { div } from "framer-motion/client"
import { Controller, SubmitHandler, useForm } from "react-hook-form"

import { RegisterFormProps } from "@/types/auth/auth"
import { RegisterFormData, registerSchema } from "@/lib/validators/validator"

import AuthButton from "../ui/AuthButton"
import DatePickerField from "../ui/DateField"
import InputField from "./InputField"

interface RegisterFormComponentProps extends RegisterFormProps {}

export default function RegisterForm({ onSubmit }: RegisterFormComponentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    control,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
      dob: undefined,
      gender: undefined,
      phone: undefined,
    },
  })

  const loading = isSubmitting

  const handleFormSubmit: SubmitHandler<RegisterFormData> = async (data) => {
    try {
      setIsSubmitting(true)
      clearErrors()

      if (onSubmit) {
        await onSubmit(data)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.field) {
        setError(error.field as keyof RegisterFormData, {
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
    <div className="flex flex-col justify-center items-start">
      <h2 className="text-xl font-semibold mb-4 w-full text-center">
        Register
      </h2>
      <InputField
        {...register("username")}
        placeholder="Username"
        disabled={loading}
        className={
          errors.email ? "border-red-500 bg-red-50 red-500" : "border-gray-300"
        }
      />
      {errors.username && (
        <p
          id="username-error"
          className="text-red-500 text-sm mb-2"
          role="alert"
        >
          {errors.username.message}
        </p>
      )}
      <InputField
        {...register("email")}
        placeholder="Email"
        type="email"
        disabled={loading}
        className={
          errors.email ? "border-red-500 bg-red-50 red-500" : "border-gray-300"
        }
      />
      {errors.email && (
        <p id="email-error" className="text-red-500 text-sm mb-2" role="alert">
          {errors.email.message}
        </p>
      )}
      <InputField
        {...register("password")}
        placeholder="Password"
        type="password"
        disabled={loading}
        className={
          errors.email ? "border-red-500 bg-red-50 red-500" : "border-gray-300"
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
      <InputField
        {...register("confirmPassword")}
        placeholder="Confirm Password"
        type="password"
        disabled={loading}
        className={
          errors.email ? "border-red-500 bg-red-50 red-500" : "border-gray-300"
        }
      />
      {errors.confirmPassword && (
        <p
          id="confirmPassword-error"
          className="text-red-500 text-sm mb-2"
          role="alert"
        >
          {errors.confirmPassword.message}
        </p>
      )}

      <section className="flex justify-between gap-3 mb-3">
        <Controller
          name="dob"
          control={control}
          render={({ field }) => (
            <DatePickerField value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <div className="relative">
              <select
                {...field}
                className="p-3 pr-10 border border-gray-300 rounded-md appearance-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-sm">
                ▼
              </div>
            </div>
          )}
        />
      </section>

      <InputField
        type="tel"
        {...register("phone")}
        placeholder="Phone number"
        disabled={loading}
        className={
          errors.phone ? "border-red-500 bg-red-50 red-500" : "border-gray-300"
        }
      />
      {errors.phone && (
        <p id="phone-error" className="text-red-500 text-sm" role="alert">
          {errors.phone.message}
        </p>
      )}

      <label className="flex items-center mb-2" htmlFor="terms">
        <input
          type="checkbox"
          size={20}
          {...register("terms")}
          id="terms"
          className="accent-blue-500 scale-100"
        />
        <span className="text-sm text-gray-500 italic m-2">
          Accepts terms of service and private policy
        </span>
      </label>

      <AuthButton loading={loading} label="Register" />
      {(errors.root?.message || errors.terms?.message) && (
        <p className="mr-auto text-red-500 text-sm" role="alert">
          {errors.terms?.message || errors.root?.message}
        </p>
      )}
    </div>
  )
}
