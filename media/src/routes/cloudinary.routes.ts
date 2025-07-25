import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware";
import { signUpload } from "../controllers/cloudinary.controller";
import { validateBody } from "../middlewares/validator";
import { signUploadSchema } from "../schema/document.schema";

const mediaRouter = Router();

mediaRouter.post(
    "/sign-upload",
    verifyFirebaseToken,
    validateBody(signUploadSchema),
    signUpload,
);

export default mediaRouter;
