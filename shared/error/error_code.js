const ERROR_CODE = {
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  AUTH_ERROR: "UNAUTHORIZED",
  MISSING_DATA: "MISSING_DATA",
  INVALID_DATA: "INVALID_DATA",

  // Firebase Auth Errors
  AUTH_INVALID_EMAIL: "auth/invalid-email",
  AUTH_USER_DISABLED: "auth/user-disabled",
  AUTH_USER_NOT_FOUND: "auth/user-not-found",
  AUTH_WRONG_PASSWORD: "auth/wrong-password",
  AUTH_EMAIL_ALREADY_IN_USE: "auth/email-already-in-use",
  AUTH_OPERATION_NOT_ALLOWED: "auth/operation-not-allowed",
  AUTH_WEAK_PASSWORD: "auth/weak-password",
  AUTH_INVALID_CREDENTIAL: "auth/invalid-credential",
  AUTH_INVALID_VERIFICATION_CODE: "auth/invalid-verification-code",
  AUTH_INVALID_VERIFICATION_ID: "auth/invalid-verification-id",
  AUTH_REQUIRES_RECENT_LOGIN: "auth/requires-recent-login",
  AUTH_CREDENTIAL_ALREADY_IN_USE: "auth/credential-already-in-use",
  AUTH_ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL:
    "auth/account-exists-with-different-credential",
  AUTH_NETWORK_REQUEST_FAILED: "auth/network-request-failed",
  AUTH_TOO_MANY_REQUESTS: "auth/too-many-requests",
  AUTH_TIMEOUT: "auth/timeout",
  AUTH_QUOTA_EXCEEDED: "auth/quota-exceeded",
  AUTH_APP_NOT_AUTHORIZED: "auth/app-not-authorized",
  AUTH_MISSING_VERIFICATION_CODE: "auth/missing-verification-code",
  AUTH_MISSING_VERIFICATION_ID: "auth/missing-verification-id",
  AUTH_INVALID_PHONE_NUMBER: "auth/invalid-phone-number",
  AUTH_MISSING_PHONE_NUMBER: "auth/missing-phone-number",
  AUTH_SESSION_EXPIRED: "auth/code-expired",
  AUTH_POPUP_BLOCKED: "auth/popup-blocked",
  AUTH_POPUP_CLOSED_BY_USER: "auth/popup-closed-by-user",
  AUTH_UNAUTHORIZED_DOMAIN: "auth/unauthorized-domain",
  AUTH_CANCELLED_POPUP_REQUEST: "auth/cancelled-popup-request",
  AUTH_INVALID_ACTION_CODE: "auth/invalid-action-code",
  AUTH_EXPIRED_ACTION_CODE: "auth/expired-action-code",
  AUTH_USER_TOKEN_EXPIRED: "auth/user-token-expired",
  AUTH_INVALID_API_KEY: "auth/invalid-api-key",
  AUTH_INVALID_USER_TOKEN: "auth/invalid-user-token",
  AUTH_USER_MISMATCH: "auth/user-mismatch",
  AUTH_PROVIDER_ALREADY_LINKED: "auth/provider-already-linked",
  AUTH_NO_SUCH_PROVIDER: "auth/no-such-provider",
  AUTH_INVALID_CUSTOM_TOKEN: "auth/invalid-custom-token",
  AUTH_CUSTOM_TOKEN_MISMATCH: "auth/custom-token-mismatch",
  AUTH_INVALID_ID_TOKEN: "auth/invalid-id-token",
  AUTH_APP_NOT_INSTALLED: "auth/app-not-installed",
  AUTH_INVALID_PERSISTENCE_TYPE: "auth/invalid-persistence-type",
  AUTH_UNSUPPORTED_PERSISTENCE_TYPE: "auth/unsupported-persistence-type",
  AUTH_INVALID_DYNAMIC_LINK_DOMAIN: "auth/invalid-dynamic-link-domain",
  AUTH_MISSING_CONTINUE_URI: "auth/missing-continue-uri",
  AUTH_INVALID_CONTINUE_URI: "auth/invalid-continue-uri",
  AUTH_UNVERIFIED_EMAIL: "auth/unverified-email",
  AUTH_INVALID_RECIPIENT_EMAIL: "auth/invalid-recipient-email",
  AUTH_INVALID_SENDER: "auth/invalid-sender",
  AUTH_INVALID_MESSAGE_PAYLOAD: "auth/invalid-message-payload",
  AUTH_MISSING_ANDROID_PACKAGE_NAME: "auth/missing-android-pkg-name",
  AUTH_MISSING_IOS_BUNDLE_ID: "auth/missing-ios-bundle-id",
  AUTH_MISSING_OR_INVALID_NONCE: "auth/missing-or-invalid-nonce",
  AUTH_INVALID_SESSION_INFO: "auth/invalid-session-info",
  AUTH_INVALID_TENANT_ID: "auth/invalid-tenant-id",
  AUTH_TENANT_ID_MISMATCH: "auth/tenant-id-mismatch",
  AUTH_UNSUPPORTED_TENANT_OPERATION: "auth/unsupported-tenant-operation",
  AUTH_MISSING_CLIENT_IDENTIFIER: "auth/missing-client-identifier",
  AUTH_INVALID_CLIENT_IDENTIFIER: "auth/invalid-client-identifier",
  AUTH_UNSUPPORTED_FIRST_FACTOR: "auth/unsupported-first-factor",
  AUTH_UNSUPPORTED_SECOND_FACTOR: "auth/unsupported-second-factor",
  AUTH_INVALID_MFA_SESSION: "auth/invalid-mfa-session",
  AUTH_MFA_INFO_NOT_FOUND: "auth/mfa-info-not-found",
  AUTH_ADMIN_ONLY_OPERATION: "auth/admin-restricted-operation",
  AUTH_ARGUMENT_ERROR: "auth/argument-error",
  AUTH_CAPTCHA_CHECK_FAILED: "auth/captcha-check-failed",
  AUTH_CORDOVA_NOT_READY: "auth/cordova-not-ready",
  AUTH_DYNAMIC_LINK_NOT_ACTIVATED: "auth/dynamic-link-not-activated",
  AUTH_EMAIL_CHANGE_NEEDS_VERIFICATION: "auth/email-change-needs-verification",
  AUTH_INTERNAL_ERROR: "auth/internal-error",
  AUTH_INVALID_APP_CREDENTIAL: "auth/invalid-app-credential",
  AUTH_INVALID_APP_ID: "auth/invalid-app-id",
  AUTH_INVALID_AUTH_EVENT: "auth/invalid-auth-event",
  AUTH_INVALID_CERT_HASH: "auth/invalid-cert-hash",
  AUTH_INVALID_CONTINUE_URI: "auth/invalid-continue-uri",
  AUTH_INVALID_CREDENTIAL: "auth/invalid-credential",
  AUTH_INVALID_DYNAMIC_LINK_DOMAIN: "auth/invalid-dynamic-link-domain",
  AUTH_INVALID_EMAIL: "auth/invalid-email",
  AUTH_INVALID_IDP_RESPONSE: "auth/invalid-idp-response",
  AUTH_INVALID_MESSAGE_PAYLOAD: "auth/invalid-message-payload",
  AUTH_INVALID_MFA_PENDING_CREDENTIAL: "auth/invalid-mfa-pending-credential",
  AUTH_INVALID_OAUTH_CLIENT_ID: "auth/invalid-oauth-client-id",
  AUTH_INVALID_OAUTH_PROVIDER: "auth/invalid-oauth-provider",
  AUTH_INVALID_PERSISTENCE: "auth/invalid-persistence",
  AUTH_INVALID_PHONE_NUMBER: "auth/invalid-phone-number",
  AUTH_INVALID_PROVIDER_ID: "auth/invalid-provider-id",
  AUTH_INVALID_RECIPIENT_EMAIL: "auth/invalid-recipient-email",
  AUTH_INVALID_SENDER: "auth/invalid-sender",
  AUTH_INVALID_SESSION_INFO: "auth/invalid-session-info",
  AUTH_INVALID_TENANT_ID: "auth/invalid-tenant-id",
  AUTH_MISSING_ANDROID_PACKAGE_NAME: "auth/missing-android-pkg-name",
  AUTH_MISSING_APP_CREDENTIAL: "auth/missing-app-credential",
  AUTH_MISSING_AUTH_DOMAIN: "auth/missing-auth-domain",
  AUTH_MISSING_CODE: "auth/missing-code",
  AUTH_MISSING_CONTINUE_URI: "auth/missing-continue-uri",
  AUTH_MISSING_IFRAME_START: "auth/missing-iframe-start",
  AUTH_MISSING_IOS_BUNDLE_ID: "auth/missing-ios-bundle-id",
  AUTH_MISSING_OR_INVALID_NONCE: "auth/missing-or-invalid-nonce",
  AUTH_MISSING_PHONE_NUMBER: "auth/missing-phone-number",
  AUTH_MISSING_VERIFICATION_CODE: "auth/missing-verification-code",
  AUTH_MISSING_VERIFICATION_ID: "auth/missing-verification-id",
  AUTH_NETWORK_REQUEST_FAILED: "auth/network-request-failed",
  AUTH_OPERATION_NOT_ALLOWED: "auth/operation-not-allowed",
  AUTH_POPUP_BLOCKED: "auth/popup-blocked",
  AUTH_POPUP_CLOSED_BY_USER: "auth/popup-closed-by-user",
  AUTH_PROVIDER_ALREADY_LINKED: "auth/provider-already-linked",
  AUTH_QUOTA_EXCEEDED: "auth/quota-exceeded",
  AUTH_REJECTED_CREDENTIAL: "auth/rejected-credential",
  AUTH_SECOND_FACTOR_ALREADY_ENROLLED: "auth/second-factor-already-enrolled",
  AUTH_SECOND_FACTOR_LIMIT_EXCEEDED: "auth/second-factor-limit-exceeded",
  AUTH_TENANT_ID_MISMATCH: "auth/tenant-id-mismatch",
  AUTH_TIMEOUT: "auth/timeout",
  AUTH_UNAUTHORIZED_DOMAIN: "auth/unauthorized-domain",
  AUTH_UNSUPPORTED_FIRST_FACTOR: "auth/unsupported-first-factor",
  AUTH_UNSUPPORTED_SECOND_FACTOR: "auth/unsupported-second-factor",
  AUTH_UNSUPPORTED_TENANT_OPERATION: "auth/unsupported-tenant-operation",
  AUTH_USER_CANCELLED: "auth/user-cancelled",
  AUTH_USER_MISMATCH: "auth/user-mismatch",
  AUTH_USER_NOT_FOUND: "auth/user-not-found",
  AUTH_USER_TOKEN_EXPIRED: "auth/user-token-expired",
  AUTH_WEAK_PASSWORD: "auth/weak-password",
  AUTH_WEB_STORAGE_UNSUPPORTED: "auth/web-storage-unsupported",
};

export default ERROR_CODE;
