import { v1 } from "@google-cloud/vision";
import config from "../config";

let visionClient: v1.ImageAnnotatorClient | null = null;

export const getVisionClient = (): v1.ImageAnnotatorClient => {
  if (visionClient) {
    return visionClient;
  }

  const keyFilename = config.vision.credentials;

  if (!keyFilename) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Please check your .env file."
    );
  }

  console.log(`[VisionClient] Initializing with key from: ${keyFilename}`);

  try {
    visionClient = new v1.ImageAnnotatorClient({
      keyFilename: keyFilename,
    });

    console.log(
      "[VisionClient] Successfully initialized Google Vision Client."
    );
    return visionClient;
  } catch (error) {
    console.error(
      "[VisionClient] FATAL: Failed to initialize Google Vision Client.",
      error
    );
    throw new Error(
      "Could not initialize Vision Client. Check the key file path and its content."
    );
  }
};
