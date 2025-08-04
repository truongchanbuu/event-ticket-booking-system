// TODO: Add type: "authenticated" + Xử lý bảo mật cho các files quan trọng
import config from "../config";
import { cloudinary } from "../lib/clients";
import { extractPublicIdFromUrl } from "../lib/file.helper";

export const getUploadSignature = ({
    folder,
    timestamp,
}: {
    folder: string;
    timestamp: number;
}): string => {
    return cloudinary.utils.api_sign_request(
        { timestamp, folder },
        config.cloudinary.api_secret!,
        // TODO: type: "authenticated"
    );
};

export async function deleteImageFromCloudinary(url: string) {
    try {
        const publicId = extractPublicIdFromUrl(url);
        console.log(`PUB: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
            resource_type: "image",
        });

        return result;
    } catch (e) {
        console.error("Error from deleting Cloudinary:", e);
        throw new Error("Cannot delete Cloudinary.");
    }
}
