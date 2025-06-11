import admin from "firebase-admin";
import REVOKE_REASON from "../enums/revoke_reason.enum.js";
import { REVOKE_TOPIC } from "../kafka/topics.js";
import { sendKafkaMessage } from "../kafka/procuder.js";

export default class AuthService {
    constructor({ logger }) {
        this.logger = logger;
    }

    async revokeToken(uid, reason = REVOKE_REASON.SYSTEM, actor = {}) {
        try {
            await admin.auth().revokeRefreshTokens(uid);

            await sendKafkaMessage({
                topic: REVOKE_TOPIC,
                key: uid,
                value: {
                    uid,
                    actor,
                    reason,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (e) {
            this.logger.error("Failed to revoke token:", e);
            throw e;
        }
    }

    async getClaims(uid) {
        try {
            const user = await admin.auth().getUser(uid);
            return user.customClaims || {};
        } catch (e) {
            this.logger.error("Failed to get claims:", e);
            throw e;
        }
    }

    async setClaims(uid, claims, merge = true) {
        try {
            let finalClaims = claims;

            if (merge) {
                const user = await admin.auth().getUser(uid);
                finalClaims = {
                    ...user.customClaims,
                    ...claims,
                };
            }

            await admin.auth().setCustomUserClaims(uid, finalClaims);
            return finalClaims;
        } catch (e) {
            this.logger.error("Failed to set claims:", e);
            throw e;
        }
    }

    async healthCheck() {
        try {
            await admin.auth().getUserByEmail("healthcheck@system.com");
            return {
                status: "connected",
                projectId: admin.app().options.projectId,
            };
        } catch (e) {
            return { status: "disconnected", error: e.message };
        }
    }
}
