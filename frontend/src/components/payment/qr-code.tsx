import { useEffect, useRef } from "react"

interface QRCodeProps {
  value: string
  size?: number
  className?: string
}

export default function QRCode({
  value,
  size = QRCODE_SIZE,
  className = "",
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Simple QR code placeholder (in a real app, use a QR code library)
    canvas.width = size
    canvas.height = size

    // Clear canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, size, size)

    // Draw QR code pattern (simplified placeholder)
    ctx.fillStyle = "#000000"
    const cellSize = size / 21 // 21x21 grid for simplicity

    // Create a simple pattern that looks like a QR code
    for (let row = 0; row < 21; row++) {
      for (let col = 0; col < 21; col++) {
        // Simple hash function to create deterministic but pseudo-random pattern
        const hash = (value.charCodeAt(0) + row * 7 + col * 13) % 100
        if (hash > 50) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
        }
      }
    }

    // Draw corner markers (typical QR code feature)
    const markerSize = cellSize * 7

    // Top-left corner
    ctx.fillRect(0, 0, markerSize, markerSize)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(
      cellSize,
      cellSize,
      markerSize - 2 * cellSize,
      markerSize - 2 * cellSize
    )
    ctx.fillStyle = "#000000"
    ctx.fillRect(
      cellSize * 2,
      cellSize * 2,
      markerSize - 4 * cellSize,
      markerSize - 4 * cellSize
    )

    // Top-right corner
    ctx.fillStyle = "#000000"
    ctx.fillRect(size - markerSize, 0, markerSize, markerSize)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(
      size - markerSize + cellSize,
      cellSize,
      markerSize - 2 * cellSize,
      markerSize - 2 * cellSize
    )
    ctx.fillStyle = "#000000"
    ctx.fillRect(
      size - markerSize + cellSize * 2,
      cellSize * 2,
      markerSize - 4 * cellSize,
      markerSize - 4 * cellSize
    )

    // Bottom-left corner
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, size - markerSize, markerSize, markerSize)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(
      cellSize,
      size - markerSize + cellSize,
      markerSize - 2 * cellSize,
      markerSize - 2 * cellSize
    )
    ctx.fillStyle = "#000000"
    ctx.fillRect(
      cellSize * 2,
      size - markerSize + cellSize * 2,
      markerSize - 4 * cellSize,
      markerSize - 4 * cellSize
    )
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      className={`border border-gray-200 rounded-lg ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
