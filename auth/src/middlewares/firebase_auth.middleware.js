import { AppError } from "@event_ticket_booking_system/shared";
import ROLE from "../enums/role.enum.js";
import { admin } from "../firebase.js";
import ERROR_CODE from "@event_ticket_booking_system/shared/error/error_code.js";
import { FirebaseAuthErrorMap } from "@event_ticket_booking_system/shared";

export async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.split(" ")[1];

    const errorResponse =
        FirebaseAuthErrorMap[ERROR_CODE.AUTH_INVALID_ID_TOKEN];

    if (!idToken) {
        throw new AppError({
            message: errorResponse,
            statusCode: 401,
            errorCode: ERROR_CODE.AUTH_INVALID_ID_TOKEN,
        });
    }

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.user = decoded;
        next();
    } catch (e) {
        console.error(e);
        throw new AppError({
            message: errorResponse,
            statusCode: 401,
            errorCode: ERROR_CODE.AUTH_INVALID_ID_TOKEN,
        });
    }
}

export async function checkAdmin(req, res, next) {
    if (req.user.role !== ROLE.ADMIN) {
        throw new AppError({
            message: "Access Denied",
            errorCode: ERROR_CODE.UNAUTHORIZED,
            statusCode: 403,
        });
    }
    next();
}

export async function checkOwnerOrAdmin(req, _, next) {
    const { uid } = req.params;
    const requesterUid = req.user.uid;
    const isAdmin = req.user.role === ROLE.ADMIN;

    if (uid !== requesterUid && !isAdmin) {
        throw new AppError({
            message: "Access Denined",
            errorCode: ERROR_CODE.FORBIDDEN,
            statusCode: 403,
        });
    }

    next();
}
