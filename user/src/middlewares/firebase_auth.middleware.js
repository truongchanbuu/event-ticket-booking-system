import {
    AppError,
    FirebaseAuthErrorMap,
    ROLE,
} from "@event_ticket_booking_system/shared";
import ERROR_CODE from "@event_ticket_booking_system/shared/error/error_code.js";
// import { admin } from "../firebase.js";
import { admin } from "../firebase-emulator.js"; //TODO: Test only

const isEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

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
        let decoded;
        if (isEmulator) {
            console.log("[Firebase Emulator] Skipping token verification.");
            decoded = parseJwt(idToken);
            console.log("decoded ", decoded);
        } else {
            decoded = await admin.auth().verifyIdToken(idToken);
        }

        if (!decoded) {
            throw new AppError({
                message: errorResponse,
                statusCode: 401,
                errorCode: ERROR_CODE.AUTH_INVALID_ID_TOKEN,
            });
        }

        req.user = decoded;
        next();
    } catch (e) {
        console.error(JSON.stringify(e));
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

//TODO: Test only
function base64UrlDecode(base64Url) {
    return Buffer.from(
        base64Url.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
    ).toString();
}

function parseJwt(token) {
    try {
        const [, payloadBase64] = token.split(".");
        const payload = base64UrlDecode(payloadBase64);

        return JSON.parse(payload);
    } catch (error) {
        return null;
    }
}
