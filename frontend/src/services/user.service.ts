import { updateUserAPI, deleteUserAPI, getUserProfileAPI } from "@/lib/api";
import { getAuthToken } from "./auth.service";
import { UpdateUserData, AppUser, fromFirebaseUser } from "@/schema/user";
import { ApiResponseError } from "@/schema/api-error";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export class UserService {
  static async getCurrentUserProfile() {
    try {
      return await getUserProfileAPI();
    } catch (e) {
      const error = e as ApiResponseError;
      console.error("Error in getUserProfileAPI:", error);
      return null;
    }
  }

  static async updateUserProfile(userData: UpdateUserData) {
    console.log(`send update data: ${userData}`);
    const user = await updateUserAPI(userData);
    if (user) {
      await auth.currentUser?.reload();
    }

    return user;
  }

  static async deleteUserAccount() {
    return await deleteUserAPI();
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
