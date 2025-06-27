import { useEffect, useState } from "react"

interface CountdownTimerProps {
  initialMinutes?: number
  initialSeconds?: number
  onExpired?: () => void
}

export default function CountdownTimer({
  initialMinutes = INITAL_COUNTDOWN_MIN,
  initialSeconds = INITAL_COUNTDOWN_SEC,
  onExpired,
}: CountdownTimerProps) {
  const [minutes, setMinutes] = useState(initialMinutes)
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    const interval = setInterval(() => {
      if (seconds > 0) {
        setSeconds(seconds - 1)
      } else if (minutes > 0) {
        setMinutes(minutes - 1)
        setSeconds(59)
      } else {
        clearInterval(interval)
        onExpired?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [minutes, seconds, onExpired])

  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  return (
    <div className="text-right">
      <div className="text-sm text-gray-500">Tickets held for</div>
      <div className="countdown-text">{formattedTime}</div>
    </div>
  )
}
