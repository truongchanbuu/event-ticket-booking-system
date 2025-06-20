"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>Đã xảy ra lỗi!</h2>
      <button onClick={() => reset()}>Thử lại</button>
    </div>
  )
}
