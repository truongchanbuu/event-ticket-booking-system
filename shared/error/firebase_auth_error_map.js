import ERROR_CODE from "./error_code.js";

const FirebaseAuthErrorMap = {
  "auth/invalid-email": {
    code: ERROR_CODE.AUTH_INVALID_EMAIL,
    message: "Invalid email or password",
    statusCode: 400,
  },
  "auth/user-disabled": {
    code: ERROR_CODE.AUTH_USER_DISABLED,
    message: "Account has been disabled",
    statusCode: 403,
  },
  "auth/user-not-found": {
    code: ERROR_CODE.AUTH_USER_NOT_FOUND,
    message: "User not found",
    statusCode: 404,
  },
  "auth/wrong-password": {
    code: ERROR_CODE.AUTH_WRONG_PASSWORD,
    message: "Wrong password.",
    statusCode: 401,
  },
  "auth/email-already-in-use": {
    code: ERROR_CODE.AUTH_EMAIL_ALREADY_IN_USE,
    message: "Email has been used",
    statusCode: 409,
  },
  "auth/operation-not-allowed": {
    code: ERROR_CODE.AUTH_OPERATION_NOT_ALLOWED,
    message: "Not allowed operation",
    statusCode: 403,
  },
  "auth/weak-password": {
    code: ERROR_CODE.AUTH_WEAK_PASSWORD,
    message: "Weak password",
    statusCode: 400,
  },
  "auth/too-many-requests": {
    code: ERROR_CODE.AUTH_TOO_MANY_REQUESTS,
    message: "Too many request",
    statusCode: 429,
  },
  "auth/network-request-failed": {
    code: ERROR_CODE.AUTH_NETWORK_REQUEST_FAILED,
    message: "Network connection failed",
    statusCode: 503,
  },
  "auth/internal-error": {
    code: ERROR_CODE.INTERNAL_ERROR,
    message: "Internal error",
    statusCode: 500,
  },
  "auth/invalid-password": {
    code: ERROR_CODE.AUTH_INVALID_PASSWORD,
    message: "Invalid email or password",
    statusCode: 400,
  },
  "auth/invalid-phone-number": {
    code: ERROR_CODE.AUTH_INVALID_PHONE,
    message: "Invalid phone number",
    statusCode: 400,
  },
  "auth/missing-phone-number": {
    code: ERROR_CODE.AUTH_MISSING_PHONE,
    message: "Missing phone number",
    statusCode: 400,
  },
  "auth/phone-number-already-exists": {
    code: ERROR_CODE.AUTH_PHONE_ALREADY_EXISTS,
    message: "Phone has been used",
    statusCode: 409,
  },
  "auth/invalid-verification-code": {
    code: ERROR_CODE.AUTH_INVALID_VERIFICATION_CODE,
    message: "Invalid verification code",
    statusCode: 400,
  },
  "auth/missing-verification-code": {
    code: ERROR_CODE.AUTH_MISSING_VERIFICATION_CODE,
    message: "Missing verification code",
    statusCode: 400,
  },
  "auth/invalid-id-token": {
    code: ERROR_CODE.AUTH_INVALID_ID_TOKEN,
    message: "Invalid ID Token",
    statusCode: 401,
  },
  "auth/id-token-expired": {
    code: ERROR_CODE.AUTH_ID_TOKEN_EXPIRED,
    message: "Expired ID Token",
    statusCode: 401,
  },
  "auth/uid-already-exists": {
    code: ERROR_CODE.AUTH_UID_ALREADY_EXISTS,
    message: "Account has been existed",
    statusCode: 409,
  },
  "auth/claims-too-large": {
    code: ERROR_CODE.AUTH_CLAIMS_TOO_LARGE,
    message: "Custom claims too large",
    statusCode: 400,
  },
  "auth/invalid-claims": {
    code: ERROR_CODE.AUTH_INVALID_CLAIMS,
    message: "Invalid custom claims",
    statusCode: 400,
  },
  "auth/invalid-credential": {
    code: ERROR_CODE.AUTH_INVALID_CREDENTIAL,
    message: "Invalid credentials",
    statusCode: 401,
  },
  "auth/credential-already-in-use": {
    code: ERROR_CODE.AUTH_CREDENTIAL_ALREADY_IN_USE,
    message: "Invalid credentials",
    statusCode: 409,
  },
};

export default FirebaseAuthErrorMap;
