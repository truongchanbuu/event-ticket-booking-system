import { Request, Response, NextFunction } from "express";
import admin from "../lib/firebase";
import { AuthenticatedRequest } from "../types/auth";

export const verifyFirebaseToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
            .status(401)
            .json({ message: "Missing or invalid Authorization header" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const typedReq = req as unknown as AuthenticatedRequest;
        typedReq.user = {
            uid: decoded.uid,
            email: decoded.email,
        };
        next();
    } catch (error) {
        console.error("Firebase token verification failed", error);
        return res.status(401).json({ message: "Invalid Firebase token" });
    }
};
