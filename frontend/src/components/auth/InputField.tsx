import React, { useState } from "react"

import { cn } from "@/lib/class.utils"
import inputDefaultClass from "@/styles/auth/input.style"

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  keepDefault?: boolean
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
    )
  }
)

InputField.displayName = "InputField"
export default InputField
