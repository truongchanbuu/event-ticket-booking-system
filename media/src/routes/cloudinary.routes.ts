import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware";
import { deleteImage, signUpload } from "../controllers/cloudinary.controller";
import { validateBody } from "../middlewares/validator";
import { signUploadSchema } from "../schema/document.schema";
import { deleteImageSchema } from "../schema/delete-image,schema";

const mediaRouter = Router();

mediaRouter.post(
    "/sign-upload",
    verifyFirebaseToken,
    validateBody(signUploadSchema),
    signUpload,
);

mediaRouter.put(
    "/delete-cloudinary-image",
    verifyFirebaseToken,
    validateBody(deleteImageSchema),
    deleteImage,
);

export default mediaRouter;
