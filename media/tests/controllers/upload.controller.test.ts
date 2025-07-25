import request from "supertest";
import app from "../../src/app"; // Express app
import { getUploadSignature } from "../../src/services/cloudinary.service";
import * as firebaseAuth from "firebase-admin/auth";

// Mock Cloudinary signature service
jest.mock("../../src/services/cloudinary.service", () => ({
    getUploadSignature: jest.fn(() => "fake-signature"),
}));

// Mock Firebase Admin Auth
jest.spyOn(firebaseAuth, "getAuth").mockReturnValue({
    verifyIdToken: jest.fn((token: string) => {
        if (token === "valid-token") {
            return Promise.resolve({ uid: "test-user-id" });
        } else {
            return Promise.reject(new Error("Invalid token"));
        }
    }),
} as any);

describe("POST /api/media/sign-upload", () => {
    it("🔒 should reject unauthorized requests", async () => {
        const res = await request(app).post("/api/media/sign-upload");
        expect(res.status).toBe(401);
    });

    it("🔒 should reject invalid token", async () => {
        const res = await request(app)
            .post("/api/media/sign-upload")
            .set("Authorization", "Bearer invalid-token");
        expect(res.status).toBe(401);
    });

    it("✅ should return signature with valid token (no docType)", async () => {
        const res = await request(app)
            .post("/api/media/sign-upload")
            .set("Authorization", "Bearer valid-token")
            .send({});

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("signature", "fake-signature");
        expect(res.body).toHaveProperty("timestamp");
        expect(res.body).toHaveProperty("folder");
        expect(res.body.folder).toMatch(/^documents\/test-user-id\//);
        expect(res.body).toHaveProperty("api_key");
    });

    it("✅ should return signature with valid docType", async () => {
        const res = await request(app)
            .post("/api/media/sign-upload")
            .set("Authorization", "Bearer valid-token")
            .send({ docType: "id_card" });

        expect(res.status).toBe(200);
        expect(res.body.folder).toMatch(/^documents\/id_card\/test-user-id\//);
    });

    it("💥 should handle internal server error", async () => {
        // Force service to throw
        (getUploadSignature as jest.Mock).mockImplementationOnce(() => {
            throw new Error("Internal error");
        });

        const res = await request(app)
            .post("/api/media/sign-upload")
            .set("Authorization", "Bearer valid-token")
            .send({});

        expect(res.status).toBe(500);
        expect(res.body.message).toMatch(/internal server error/i);
    });
});
