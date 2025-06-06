import React from "react"
import { twMerge } from "tailwind-merge"

import inputDefaultClass from "@/styles/auth/input.style"

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  keepDefault?: boolean
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
    )
  }
)

InputField.displayName = "InputField"
export default InputField
