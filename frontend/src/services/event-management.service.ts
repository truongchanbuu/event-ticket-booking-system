import { uploadToCloudinary } from "./cloudinary.service";

export class EventManagementService {
  static async uploadThumbnails({
    userID,
    file,
  }: {
    userID: string;
    file: any;
  }): Promise<string> {
    return await uploadToCloudinary(file, "thumbnails", userID, "events");
  }

  static async uploadContributorUrls({
    userID,
    file,
  }: {
    userID: string;
    file: any;
  }): Promise<string> {
    return await uploadToCloudinary(file, "contributors", userID, "events");
  }
}
