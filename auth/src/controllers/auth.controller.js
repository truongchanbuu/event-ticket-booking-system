import { admin, catchAsync, ROLE } from "@event_ticket_booking_system/shared";
import REVOKE_REASON from "../enums/revoke_reason.enum.js";
import { sendUserDeleted } from "../kafka/auth.event.js";
import config from "../config/index.js";
import { COOKIE_NAME, SESSION_EXPIRE_MS } from "../config/constants.js";

export default class AuthController {
    constructor({ authService }) {
        this.authService = authService;

        this.verifyToken = catchAsync(this.verifyToken.bind(this));
        this.verifySessionCookies = catchAsync(
            this.verifySessionCookies.bind(this),
        );
        this.revokeToken = catchAsync(this.revokeToken.bind(this));
        this.logout = catchAsync(this.logout.bind(this));
        this.createSession = catchAsync(this.createSession.bind(this));
        this.getClaims = catchAsync(this.getClaims.bind(this));
        this.setClaims = catchAsync(this.setClaims.bind(this));
    }

    async verifyToken(req, res) {
        const decoded = req.user;
        const { uid, email, email_verified, disabled, ...customClaims } =
            decoded;

        return res.status(200).json({
            ok: true,
            user: {
                uid,
                email,
                verified: email_verified,
                disabled,
            },
            customClaims,
        });
    }

    async verifySessionCookies() {
        const session = req.cookies.get("session")?.value;

        if (!session) {
            return {
                ok: false,
                error: "Session cookie not found",
                status: 401,
            };
        }

        try {
            const decodedToken = await admin
                .auth()
                .verifySessionCookie(session, true);

            return {
                ok: true,
                user: decodedToken,
                status: 200,
            };
        } catch (error) {
            console.error("🔥 Session verification failed:", error);
            return {
                ok: false,
                error: "Invalid or expired session",
                status: 401,
            };
        }
    }

    async revokeToken(req, res) {
        const { uid } = req.body;
        const reason = req.body.reason || REVOKE_REASON.SYSTEM;

        await this.authService.revokeToken(uid, reason, {
            uid,
            role: req.user?.role,
        });

        return res.status(200).json({
            uid,
            message: "Token revoked successfully",
        });
    }

    async deleteUser(req, res) {
        const { uid } = req.params;
        const deletedUID = await this.authService.deleteUser(uid);

        if (!deletedUID) {
            return res
                .status(400)
                .json({ success: false, message: "failed to delete user" });
        }

        sendUserDeleted({ userID: uid }).catch((err) => {
            console.error("Kafka sendUserDeleted error:", err);
        });
        return res.status(200).json({ success: true, data: deletedUID });
    }

    async logout(req, res) {
        const { uid, role } = req.user;
        await this.authService.revokeToken(uid, REVOKE_REASON.SELF_REQUEST, {
            uid,
            role,
        });

        res.cookies.set({
            name: "session",
            value: "",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 0,
        });

        return res.status(200).json({
            uid,
            message: "Logout successful",
        });
    }

    async createSession(req, res) {
        try {
            const idToken = req.token;
            const {
                uid,
                email,
                email_verified,
                disabled,
                role,
                ...customClaims
            } = req.user;

            const sessionCookie = await admin
                .auth()
                .createSessionCookie(idToken, { expiresIn: SESSION_EXPIRE_MS });

            res.cookie(COOKIE_NAME || "__session", sessionCookie, {
                maxAge: SESSION_EXPIRE_MS,
                httpOnly: true,
                secure: config.node_env === "production",
                path: "/",
                sameSite: "lax",
            });

            return res.status(200).json({
                message: "Session created",
                uid,
                role: customClaims?.role ?? ROLE.CUSTOMER,
                email,
            });
        } catch (err) {
            console.error("❌ createSession error:", err);
            return res.status(401).json({
                message: "Invalid or expired ID token",
                error: err.message,
            });
        }
    }

    async getClaims(req, res) {
        const uid = req.params.uid;
        const claims = await this.authService.getClaims(uid);
        return res.status(200).json({
            uid,
            message: "Get claims successfully",
            claims,
            receivedAt: new Date().toISOString(),
        });
    }

    async setClaims(req, res) {
        const uid = req.user.uid;
        const { claims, merge = true } = req.body;

        const finalClaims = await this.authService.setClaims(
            uid,
            claims,
            merge,
        );
        return res.status(200).json({
            uid,
            updatedClaims: finalClaims,
            updatedAt: new Date().toISOString(),
        });
    }
}
