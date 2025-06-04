import { catchAsync } from "@event_ticket_booking_system/shared";
import REVOKE_REASON from "../enums/revoke_reason.enum.js";

export default class AuthController {
    constructor({ authService }) {
        this.authService = authService;

        this.validateToken = catchAsync(this.validateToken.bind(this));
        this.revokeToken = catchAsync(this.revokeToken.bind(this));
        this.logout = catchAsync(this.logout.bind(this));
        this.getClaims = catchAsync(this.getClaims.bind(this));
        this.setClaims = catchAsync(this.setClaims.bind(this));
    }

    async validateToken(req, res) {
        const decoded = req.user;
        const { uid, email, email_verified, disabled, ...customClaims } =
            decoded;

        return res.status(200).json({
            valid: true,
            user: {
                uid,
                email,
                verified: email_verified,
                disabled,
            },
            customClaims,
        });
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

    async logout(req, res) {
        const { uid, role } = req.user;
        await this.authService.revokeToken(uid, REVOKE_REASON.SELF_REQUEST, {
            uid,
            role,
        });

        return res.status(200).json({
            uid,
            message: "Logout successful",
        });
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
        const uid = req.params.uid;
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
