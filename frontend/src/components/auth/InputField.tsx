<<<<<<< HEAD
import React, { useState } from "react"

import { cn } from "@/lib/class.utils"
=======
import React from "react"
import { twMerge } from "tailwind-merge"

>>>>>>> bbcf576 (feat(ui): auth ui & firebase auth implementation)
import inputDefaultClass from "@/styles/auth/input.style"

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  keepDefault?: boolean
<<<<<<< HEAD
  showToggle?: boolean
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ keepDefault = true, showToggle = false, ...props }, ref) => {
    const { className, type, ...rest } = props
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={type === "password" && showPassword ? "text" : type}
          {...rest}
          className={cn(keepDefault ? inputDefaultClass : "", className)}
        />
        {showToggle && type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        )}
      </div>
=======
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ keepDefault = true, ...props }, ref) => {
    const { className, ...rest } = props

    return (
      <input
        ref={ref}
        className={twMerge(keepDefault ? inputDefaultClass : "", className)}
        {...rest}
      />
>>>>>>> bbcf576 (feat(ui): auth ui & firebase auth implementation)
    )
  }
)

InputField.displayName = "InputField"
export default InputField
