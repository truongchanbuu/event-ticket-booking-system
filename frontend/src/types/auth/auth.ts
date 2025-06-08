// User types
export interface User {
  id: string
  email: string
  name: string
  photoUrl?: string
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

// Auth state
export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

// API Response types
export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface ApiError {
  message: string
  code?: string
  field?: string
}

// Form props
export interface BaseFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit?: (data: any) => any
  isLoading?: boolean
  className?: string
}

export interface LoginFormProps extends BaseFormProps {
  onForgotPassword?: () => void
  onSwitchToRegister?: () => void
}

export interface RegisterFormProps extends BaseFormProps {
  onSwitchToLogin?: () => void
}

export interface ResetFormProps extends BaseFormProps {
  isOpen: boolean
  onClose: () => void
}

// Social auth providers - "google" | "facebook"
export type SocialProvider = "google"

export interface SocialAuthProps {
  provider: SocialProvider
  onSuccess?: (user: User) => void
  onError?: (error: ApiError) => void
}

// Password strength
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4 // 0 = very weak, 4 = very strong
  feedback: string[]
  requirements: {
    length: boolean
    lowercase: boolean
    uppercase: boolean
    number: boolean
    special: boolean
  }
}
