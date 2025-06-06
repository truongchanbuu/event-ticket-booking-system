import Loading from "./AppLoading"

interface AuthButtonProps {
  loading?: boolean
  label: string
}

export default function AuthButton({
  loading = false,
  label,
}: AuthButtonProps) {
  return (
    <button
      className="w-full p-3 mb-2 bg-blue-500 text-white rounded flex justify-center items-center"
      disabled={loading}
    >
      {loading ? <Loading color="#fff" size={10} /> : label}
    </button>
  )
}
