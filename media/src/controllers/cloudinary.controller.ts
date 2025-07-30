import { Request, Response } from "express";
import { getUploadSignature } from "../services/cloudinary.service";
import { AuthenticatedRequest } from "../types/auth";
import config from "../config";

export const signUpload = async (req: Request, res: Response) => {
    try {
        const { user } = req as AuthenticatedRequest;
        const userId = user?.uid;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { docType } = req.body as { docType?: string };

        const timestamp = Math.floor(Date.now() / 1000);
        const folder = docType
            ? `${config.app_name}/documents/${docType}/${userId}`
            : `${config.app_name}/documents/${userId}`;

        const signature = getUploadSignature({
            folder,
            timestamp,
        });

        return res.status(200).json({
            signature,
            timestamp,
            folder,
            api_key: config.cloudinary.api_key!,
            cloud_name: config.cloudinary.cloud_name,
        });
    } catch (error) {
        console.error("Error generating Cloudinary signature:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
