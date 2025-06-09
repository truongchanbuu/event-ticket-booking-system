import request from "supertest";
import createApp from "../../src/app.js";
import { before } from "awilix-express";

describe("GET /users with emulator", () => {
    let app;

    before(async () => await createApp());
    afterEach(async () => {
        await db.recursiveDelete(db.collection("users"));
    });

    it("should return users from Firestore Emulator", async () => {
        const token = "FAKE_TOKEN";

        const res = await request(app)
            .get("/users?page=1&limit=2")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.users.length).toBeGreaterThan(0);
        expect(res.body.users[0]).toHaveProperty("email");
    });
});
