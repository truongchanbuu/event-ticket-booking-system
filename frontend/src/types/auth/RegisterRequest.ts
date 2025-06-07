export default interface RegisterRequest {
  email: string
  password: string
  confirmedPassword: string
  username: string
  dob?: Date
  gender?: string
  phoneNumber: string
}
