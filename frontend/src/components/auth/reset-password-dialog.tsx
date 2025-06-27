import { useState } from "react"
import { Router } from "next/router"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { IoCloseCircleOutline } from "react-icons/io5"

import { ResetFormProps } from "@/types/auth/auth"
import { forgotPassword } from "@/lib/auth/firebase/auth.service"
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
  ResetPasswordFormData,
} from "@/lib/validators/validator"

export default function ResetPasswordDialog({
  isOpen,
  onClose,
  onSubmit,
}: ResetFormProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  })

  const handleSubmitForm: SubmitHandler<ForgotPasswordFormData> = async (
    data
  ) => {
    setLoading(true)
    clearErrors()

    if (onSubmit) {
      await onSubmit(data)
    }
    toast.success("Login successful! Redirecting...")

    try {
      const result = await forgotPassword({ email })

      if (result.success) {
        setSuccess(true)
        setMessage(result.message)
      }
    } catch (error: any) {
      if (error.field) {
        setError(error.field as keyof ForgotPasswordFormData, {
          message: error.message,
        })
      } else {
        setError("root", {
          message: error.message || "An error occurred during login.",
        })
      }
    } finally {
      setLoading(false)
    }

    setLoading(false)
  }

  const handleClose = () => {
    setEmail("")
    setMessage("")
    setSuccess(false)
    setLoading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)}>
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {success ? "Email has been sent" : "Forgot your password?"}
        </h2>
      </div>

      {/* Content */}
      <div className="p-6">
        {success ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <p className="text-xs text-gray-500">
              If there is no email found, please check your spam/junk
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Please enter your email
            </p>

            {errors.email && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">
                      {errors.email.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                {...register("email")}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {success ? "Close" : "Cancel"}
        </button>

        {!success && (
          <button
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending...
              </>
            ) : (
              "Send email"
            )}
          </button>
        )}
      </div>
    </form>
  )
}
