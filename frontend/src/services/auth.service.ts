import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserAPI, getUserProfileAPI } from "@/lib/api";
import { type User } from "@/schema/user/user.schema";

// Type cho việc đăng ký user (dựa trên UserSchema nhưng không có các field tự động)
type CreateUserData = Pick<User, "email" | "username" | "phoneNumber"> & {
  photoUrl?: string;
};

export interface AuthError {
  code: string;
  message: string;
}

export async function signUp(
  email: string,
  password: string,
  userData: CreateUserData
) {
  try {
    // 1. Tạo user trong Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // 2. Lưu thông tin user vào Firestore thông qua API
    try {
      const userDataForAPI = {
        ...userData,
        userID: user.uid,
        email: user.email,
        createdAt: new Date(),
      };

      await createUserAPI(userDataForAPI);

      return userCredential;
    } catch (error) {
      // Nếu lưu vào Firestore thất bại, xóa user khỏi Firebase Auth
      await user.delete();
      throw error;
    }
  } catch (error: any) {
    const authError: AuthError = {
      code: error.code || "unknown",
      message: getErrorMessage(error.code),
    };
    throw authError;
  }
}

export async function signIn(email: string, password: string) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    const authError: AuthError = {
      code: error.code || "unknown",
      message: getErrorMessage(error.code),
    };
    throw authError;
  }
}

export async function signInWithGoogle(userData?: Partial<CreateUserData>) {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Nếu có userData được cung cấp, lưu thông tin bổ sung
    if (userData && result.user) {
      try {
        const userDataForAPI = {
          ...userData,
          userID: result.user.uid,
          email: result.user.email,
          createdAt: new Date(),
        };

        await createUserAPI(userDataForAPI);
      } catch (error) {
        console.error("Failed to save additional user data:", error);
        // Không throw error vì user đã đăng nhập thành công
      }
    }

    return result;
  } catch (error: any) {
    const authError: AuthError = {
      code: error.code || "unknown",
      message: getErrorMessage(error.code),
    };
    throw authError;
  }
}

export async function logout() {
  try {
    return await signOut(auth);
  } catch (error: any) {
    const authError: AuthError = {
      code: error.code || "unknown",
      message: getErrorMessage(error.code),
    };
    throw authError;
  }
}

export async function getCurrentUserProfile(token: string) {
  return await getUserProfileAPI(token);
}

export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

// Helper function để chuyển đổi Firebase error codes thành user-friendly messages
function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    case "auth/popup-closed-by-user":
      return "Sign in was cancelled.";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Please allow pop-ups for this site.";
    case "auth/cancelled-popup-request":
      return "Sign in was cancelled.";
    default:
      return "An error occurred. Please try again.";
  }
}
