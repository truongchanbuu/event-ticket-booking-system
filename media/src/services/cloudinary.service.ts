import config from "../config";
import { cloudinary } from "../lib/clients";

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
    );
};
