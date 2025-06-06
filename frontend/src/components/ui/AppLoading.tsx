import { PropagateLoader } from "react-spinners"

interface LoadingProps {
  color?: string
  size?: number
}

export default function Loading({ color, size }: LoadingProps) {
  return (
    <div className="pt-2 pb-4">
      <PropagateLoader color={color} size={size} />
    </div>
  )
}
