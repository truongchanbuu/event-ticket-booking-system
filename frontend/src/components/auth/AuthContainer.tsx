"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import toast from "react-hot-toast"
import { FcGoogle } from "react-icons/fc"

<<<<<<< HEAD
import { loginWithGoogle } from "@/lib/auth/firebase/auth.service"
=======
import loginWithGoogle from "@/lib/auth/firebase/auth.service"
>>>>>>> bbcf576 (feat(ui): auth ui & firebase auth implementation)

import LoginForm from "./LoginForm"
import RegisterForm from "./RegisterForm"

export default function AuthContainer() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSuccessed = async (fn: any) => {
    try {
      await fn()
      toast.success("Login successful! Redirecting...")
      router.push("/")
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error(e)
      toast.error("Failed to login...")
    }
  }

  return (
    <div className="relative rounded-xl h-screen bg-white shadow-lg">
      {/* Form container - Slide opposite direction */}
      <div className="flex w-full h-full">
        <div
          className={`w-1/2 flex justify-center items-center bg-gray-100 transition-opacity duration-300 ${
            isLogin ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <RegisterForm />
        </div>

        <div
          className={`w-1/2 flex justify-center items-center bg-gray-100 transition-opacity duration-300 ${
            !isLogin ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <LoginForm />
        </div>
      </div>

      {/* Blue Panel - Slide Right/Left */}
      <motion.div
        animate={{ x: isLogin ? "0%" : "100%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute top-0 left-0 w-1/2 h-full bg-blue-500 text-white p-8 flex flex-col justify-center items-center z-10 rounded-xl"
      >
        <h1 className="text-2xl font-bold mb-2">
          {isLogin ? "Welcome Back!" : "Hello, Welcome!"}
        </h1>
        <p className="mb-3 text-sm text-center">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
        </p>
        <button
          className="px-8 py-3 font-bold border-2 border-white rounded-lg hover:bg-white hover:text-blue-500 transition-colors duration-200"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Register" : "Login"}
        </button>

        <div className="flex items-center w-full my-4">
          <div className="flex-1 h-px bg-white/30"></div>
          <span className="px-3 text-xs text-white/80">or continue with</span>
          <div className="flex-1 h-px bg-white/30"></div>
        </div>

        {/* Social login buttons */}
        <div className="flex gap-3">
          <button
            className="p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
            onClick={async () => await onSuccessed(loginWithGoogle)}
          >
            <FcGoogle className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
