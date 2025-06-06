"use client"

import { useState } from "react"

import AuthButton from "../ui/AuthButton"
import InputField from "./InputField"

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loading = isSubmitting

  // TODO: implement
  setIsSubmitting(false)

  return (
    <div className="flex flex-col justify-center items-center">
      <h2 className="text-xl font-semibold mb-4">Register</h2>
      <InputField placeholder="Username" />
      <InputField placeholder="Email" type="email" />
      <InputField placeholder="Password" type="password" />
      <AuthButton loading={loading} label="Register" />
    </div>
  )
}
