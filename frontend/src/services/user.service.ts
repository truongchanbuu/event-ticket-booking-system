import { updateUserAPI, deleteUserAPI, getUserProfileAPI } from "@/lib/api";
import { getAuthToken } from "./auth.service";

export interface UpdateUserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthday?: Date;
  avatar?: string;
}

export class UserService {
  static async getCurrentUserProfile() {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    return await getUserProfileAPI(token);
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
