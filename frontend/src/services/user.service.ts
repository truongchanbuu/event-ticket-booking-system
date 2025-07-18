import {
  updateUserAPI,
  deleteUserAPI,
  getUserProfileAPI,
  createUserAPI,
} from "@/lib/api";
import { getAuthToken } from "./auth.service";
import { UpdateUserData, AppUser, fromFirebaseUser } from "@/schema/user";
import { ApiResponseError } from "@/schema/api-error";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export class UserService {
  static async getCurrentUserProfile() {
    const token = await getAuthToken();
    try {
      if (!token) {
        throw new Error("User not authenticated");
      }

      return await getUserProfileAPI(token);
    } catch (e) {
      const error = e as ApiResponseError;
      console.error("Error in getUserProfileAPI:", error);
      throw error;
    }
  }

  static async updateUserProfile(userData: UpdateUserData) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await updateUserAPI(userData, token);
  }

  static async deleteUserAccount() {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await deleteUserAPI(token);
  }

  static async getFirebaseUser(): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  }

  static async getUserById(userId: string) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    // Implement get user by ID API call
    // This would require adding a new endpoint in the backend
    throw new Error("Not implemented yet");
  }
}
