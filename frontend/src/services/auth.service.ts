import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserAPI } from "@/lib/api";
import { AppUser } from "@/schema/user";
import { createSession, logOut } from "@/lib/api/auth/api";

export interface AuthError {
  code: string;
  message: string;
}

export async function signUp(
  email: string,
  password: string,
  userData: Partial<AppUser>
): Promise<{ userCredential: UserCredential; sessionCreated: boolean }> {
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
  } catch (error: any) {
    console.error("Sign up failed:", error);
    const authError: AuthError = {
      code: error.code || "unknown",
      message: getErrorMessage(error.code),
    };
    throw authError;
  }

  const user = userCredential.user;
  try {
    const userDataForAPI = {
      ...userData,
      userID: user.uid,
      email: user.email,
    };

    await createUserAPI(userDataForAPI);
  } catch (dbError) {
    await user.delete();
    throw dbError;
  }

  try {
    await createSession();
    return { userCredential, sessionCreated: true };
  } catch (sessionError) {
    console.error(
      "Session creation failed, but user account is created:",
      sessionError
    );

    return { userCredential, sessionCreated: false };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const userCrediential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    await createSession();
    return userCrediential;
  } catch (error: any) {
    const authError: AuthError = {
      code: error.code || "unknown",
      message: getErrorMessage(error.code),
    };
    throw authError;
  }
}

export async function signInWithGoogle(userData?: Partial<AppUser>) {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    if (result.user) {
      try {
        const username =
          userData?.username || result.user.displayName || `user`;

        const userDataForAPI: Partial<AppUser> = {
          ...userData,
          userID: result.user.uid,
          email: result.user.email!,
          username,
          emailVerified: result.user.emailVerified,
          provider: "google.com",
        };

        if (result.user.photoURL) {
          userDataForAPI.photoUrl = result.user.photoURL;
        }

        if (result.user.phoneNumber) {
          userDataForAPI.phoneNumber = result.user.phoneNumber;
        }

        await createUserAPI(userDataForAPI);
        await createSession();
      } catch (error) {
        console.error("Failed to save additional user data:", error);
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
    await signOut(auth);
    await logOut();
  } catch (error: any) {
    const authError: AuthError = {
      code: error.code || "unknown",
      message: getErrorMessage(error.code),
    };

    throw authError;
  }
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
