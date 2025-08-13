import crypto from "crypto";

export function genMockMomoKeys(ownerId) {
    return {
        partnerCode: `MOCK_${ownerId}`,
        accessKey: crypto.randomBytes(12).toString("hex"), // 24 hex
        secretKey: crypto.randomBytes(24).toString("hex"), // 48 hex
    };
}
