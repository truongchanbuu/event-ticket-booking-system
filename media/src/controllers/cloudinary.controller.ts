import { Request, Response } from "express";
import {
    deleteImageFromCloudinary,
    getUploadSignature,
} from "../services/cloudinary.service";
import { AuthenticatedRequest } from "../types/auth";
import config from "../config";

export const signUpload = async (req: Request, res: Response) => {
    try {
        const { user } = req as AuthenticatedRequest;
        const userId = user?.uid;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { docType, folder, id } = req.body as {
            docType?: string;
            folder?: string;
            id?: string;
        };

        const finalId = id ?? userId;
        let prefix = folder ? folder : "documents";
        const timestamp = Math.floor(Date.now() / 1000);
        const cloudFolder = docType
            ? `${config.app_name}/${prefix}/${finalId}/${docType}`
            : `${config.app_name}/${prefix}/${finalId}`;

        const signature = getUploadSignature({
            folder: cloudFolder,
            timestamp,
        });

        return res.status(200).json({
            signature,
            timestamp,
            folder: cloudFolder,
            api_key: config.cloudinary.api_key!,
            cloud_name: config.cloudinary.cloud_name,
        });
    } catch (error) {
        console.error("Error generating Cloudinary signature:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteImage = async (req: Request, res: Response) => {
    try {
        const { publicId } = req.body;
        if (!publicId) {
            return res.status(400).json({
                success: false,
                message: "No public id found.",
            });
        }

        const result = await deleteImageFromCloudinary(publicId);

        if (result.result !== "ok") {
            console.warn(`No image found with: ${publicId}.`);
            return res
                .status(404)
                .json({ success: false, message: "Not found" });
        }

        return res.status(200).json({ success: true, data: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            success: false,
            message: `Error in deleting image: ${e}`,
        });
    }
};
