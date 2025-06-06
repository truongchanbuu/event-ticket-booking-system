import AppError from "../app_error.js";
import ERROR_CODE from "../error_code.js";
import FirebaseAuthErrorMap from "../firebase_auth_error_map.js";

export function fromFirebaseAuthError(error) {
  const mapped = FirebaseAuthErrorMap[error.code];
  if (mapped) {
    return new AppError(mapped.message, mapped.statusCode, mapped.code);
  }

  return new AppError("Authorized Error", 500, ERROR_CODE.AUTH_ERROR);
}
