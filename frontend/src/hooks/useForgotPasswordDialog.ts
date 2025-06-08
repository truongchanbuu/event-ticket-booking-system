import { useCallback, useState } from "react"

export function useForgotPasswordDialog() {
  const [isOpen, setIsOpen] = useState(false)

  const openDialog = useCallback(() => setIsOpen(true), [])
  const closeDialog = useCallback(() => setIsOpen(false), [])

  return { isOpen, openDialog, closeDialog }
}
