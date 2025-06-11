import { db } from "../../src/firebase-emulator.js";
import request from "supertest";
import createApp from "../../src/app.js";
import { seedUsers } from "../../scripts/seeds.js";
import container from "../../src/container.js";

const USER_TOKEN =
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJuYW1lIjoiY3VzdG9tZXIiLCJwaWN0dXJlIjoiIiwicm9sZSI6ImN1c3RvbWVyIiwiZW1haWwiOiJjdXN0b21lckBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXV0aF90aW1lIjoxNzQ5NjA3ODI2LCJ1c2VyX2lkIjoiUHE5T0lOSHJMRFIxek5WM00yRDQwRDNNUXJWVCIsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiY3VzdG9tZXJAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifSwiaWF0IjoxNzQ5NjA3ODI2LCJleHAiOjE3NDk2MTE0MjYsImF1ZCI6ImV2ZW50LXRpY2tldC1ib29raW5nLXN5cy00NGViNCIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9ldmVudC10aWNrZXQtYm9va2luZy1zeXMtNDRlYjQiLCJzdWIiOiJQcTlPSU5IckxEUjF6TlYzTTJENDBEM01RclZUIn0.";
const ADMIN_TOKEN =
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJuYW1lIjoiYWRtaW4iLCJwaWN0dXJlIjoiIiwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXV0aF90aW1lIjoxNzQ5NjA3NzkwLCJ1c2VyX2lkIjoiSEJnQVpwSnFWUVFVbVgzU3RpTXNXZXhxUnhFcSIsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiYWRtaW5AZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifSwiaWF0IjoxNzQ5NjA3NzkwLCJleHAiOjE3NDk2MTEzOTAsImF1ZCI6ImV2ZW50LXRpY2tldC1ib29raW5nLXN5cy00NGViNCIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9ldmVudC10aWNrZXQtYm9va2luZy1zeXMtNDRlYjQiLCJzdWIiOiJIQmdBWnBKcVZRUVVtWDNTdGlNc1dleHFSeEVxIn0.";

describe("User Management API Tests with Firebase Emulator", () => {
    let app;
    let userService;

    beforeAll(async () => {
        app = await createApp();
        userService = container.resolve("userService");
        await seedUsers();
    });

    afterAll(async () => {
        await clearFirestoreData();
    });

    describe("Authentication & Authorization", () => {
        it("should return users with valid admin token", async () => {
            const response = await request(app)
                .get("/?limit=2")
                .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data.users)).toBe(true);
            expect(response.body.data.users.length).toBeGreaterThan(0);
        });

        it("should reject access with non-admin user token", async () => {
            const response = await request(app)
                .get("/?limit=2")
                .set("Authorization", `Bearer ${USER_TOKEN}`);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty("message");
            expect(response.body.message.toLowerCase()).toMatch(
                /forbidden|denied/,
            );
        });
    });

    describe("Default Behavior & Parameters", () => {
        beforeEach(async () => {
            await seedUsers();
        });

        test("should apply default parameters when no query provided", async () => {
            const result = await userService.getUsers({});

            expect(result.hasMore).toBe(false);
            expect(result.nextCursor).toBeDefined();

            const [first, second] = result.users;
            if (first && second) {
                expect(first.createdAt.toMillis()).toBeGreaterThanOrEqual(
                    second.createdAt.toMillis(),
                );
            }
        });

        test("should honor custom limit parameter", async () => {
            const result = await userService.getUsers({ limit: 3 });

            expect(result.users).toHaveLength(3);
            expect(result.hasMore).toBe(true);
        });

        test("should return all records if limit > available", async () => {
            const result = await userService.getUsers({ limit: 10 });

            expect(result.users.length).toBeLessThanOrEqual(5);
            expect(result.hasMore).toBe(false);
        });
    });

    describe("Data Filtering Capabilities", () => {
        beforeEach(async () => {
            await seedUsers();
        });

        test("should filter users by role", async () => {
            const result = await userService.getUsers({ role: "admin" });

            expect(result.users.every((u) => u.role === "admin")).toBe(true);
        });

        test("should filter users by status", async () => {
            const result = await userService.getUsers({ status: "active" });

            expect(result.users.every((u) => u.status === "active")).toBe(true);
        });

        test("should apply multiple filters", async () => {
            const result = await userService.getUsers({
                role: "admin",
                status: "active",
            });

            expect(result.users.length).toBeLessThanOrEqual(1);
            result.users.forEach((u) => {
                expect(u.role).toBe("admin");
                expect(u.status).toBe("active");
            });
        });

        test("should return empty array when filters match no records", async () => {
            const result = await userService.getUsers({
                role: "admin",
                status: "deleted",
            });

            expect(result.users).toHaveLength(0);
            expect(result.hasMore).toBe(false);
            expect(result.nextCursor).toBe(null);
        });
    });

    describe("Sorting Functionality", () => {
        beforeEach(async () => {
            await seedUsers();
        });

        test("should sort by createdAt descending by default", async () => {
            const result = await userService.getUsers({});

            for (let i = 0; i < result.users.length - 1; i++) {
                expect(
                    result.users[i].createdAt.toMillis(),
                ).toBeGreaterThanOrEqual(
                    result.users[i + 1].createdAt.toMillis(),
                );
            }
        });

        test("should sort by createdAt ascending", async () => {
            const result = await userService.getUsers({
                sortBy: "createdAt",
                sortOrder: "asc",
            });

            for (let i = 0; i < result.users.length - 1; i++) {
                for (let i = 0; i < result.users.length - 1; i++) {
                    expect(
                        result.users[i].createdAt.toMillis(),
                    ).toBeLessThanOrEqual(
                        result.users[i + 1].createdAt.toMillis(),
                    );
                }
            }
        });

        test("should sort by username alphabetically", async () => {
            const result = await userService.getUsers({
                sortBy: "username",
                sortOrder: "asc",
            });

            for (let i = 0; i < result.users.length - 1; i++) {
                const a = result.users[i].username;
                const b = result.users[i + 1].username;
                expect(a.localeCompare(b)).toBeLessThanOrEqual(0);
            }
        });

        test("should sort by email descending", async () => {
            const result = await userService.getUsers({
                sortBy: "email",
                sortOrder: "desc",
            });

            for (let i = 0; i < result.users.length - 1; i++) {
                expect(
                    result.users[i].email.localeCompare(
                        result.users[i + 1].email,
                        { sensitivity: "base" },
                    ),
                ).toBeGreaterThanOrEqual(0);
            }
        });

        test("should fallback to default sorting when invalid sort field is given", async () => {
            const result = await userService.getUsers({
                sortBy: "nonExistentField",
            });

            expect(result.users.length).toBeLessThanOrEqual(5);
            // Default fallback sort applied: createdAt desc
        });
    });
});

describe("POST / - Register User with Firestore Emulator", () => {
    let app;

    beforeAll(async () => {
        app = await createApp();
    });

    beforeEach(async () => {
        await clearFirestoreData();
    });

    describe("Successful registration", () => {
        test("should create user successfully and return 201", async () => {
            const userData = {
                email: "test@example.com",
                username: "Test User",
                phoneNumber: "0912345678",
            };

            // Act
            const response = await request(app)
                .post("/")
                .send(userData)
                .expect(201);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.userID).toBeDefined();
            expect(typeof response.body.userID).toBe("string");

            // Verify user được tạo trong Firestore
            const userDoc = await db
                .collection("users")
                .doc(response.body.userID)
                .get();
            expect(userDoc.exists).toBe(true);

            const savedUser = userDoc.data();
            expect(savedUser.email).toBe(userData.email);
            expect(savedUser.username).toBe(userData.username);
            expect(savedUser.phoneNumber).toBe(userData.phoneNumber);
            expect(response.body).not.toHaveProperty("password");
        });
    });

    describe("Failed registration", () => {
        test("should return 400 for duplicate email", async () => {
            const userData = {
                email: "duplicate@example.com",
                username: "First User",
            };

            await request(app).post("/").send(userData).expect(201);

            // Act - Thử tạo user thứ hai với cùng email
            const duplicateUserData = {
                email: "duplicate@example.com",
                username: "Second User",
            };

            const response = await request(app)
                .post("/")
                .send(duplicateUserData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Email already exists");

            // Verify chỉ có 1 user trong database
            const usersSnapshot = await db
                .collection("users")
                .where("email", "==", "duplicate@example.com")
                .get();
            expect(usersSnapshot.size).toBe(1);
        });

        test("should return 400 for invalid email format", async () => {
            // Arrange
            const userData = {
                email: "invalid-email",
                username: "Test User",
            };

            // Act
            const response = await request(app)
                .post("/")
                .send(userData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Validation Failed");

            // Verify không có user nào được tạo
            const usersSnapshot = await db.collection("users").get();
            expect(usersSnapshot.empty).toBe(true);
        });
    });

    describe("Input validation", () => {
        test("should return 400 for missing required fields", async () => {
            // Test cases cho các field bắt buộc
            const testCases = [
                { email: "test@example.com" },
                { username: "Test" }, // Missing email
                { email: "test@example.com" }, // Missing username
            ];

            for (const userData of testCases) {
                const response = await request(app).post("/").send(userData);

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
            }

            // Verify không có user nào được tạo
            const usersSnapshot = await db.collection("users").get();
            expect(usersSnapshot.empty).toBe(true);
        });

        test("should handle malformed JSON", async () => {
            // Act & Assert
            await request(app)
                .post("/")
                .send("invalid json")
                .set("Content-Type", "application/json")
                .expect(400);
        });

        test("should trim whitespace from inputs", async () => {
            // Arrange
            const userData = {
                email: "  test@example.com  ",
                username: "  Test User  ",
            };

            // Act
            const response = await request(app)
                .post("/")
                .send(userData)
                .expect(201);

            // Assert
            const userDoc = await db
                .collection("users")
                .doc(response.body.userID)
                .get();
            const savedUser = userDoc.data();
            expect(savedUser.email).toBe("test@example.com"); // Trimmed
            expect(savedUser.username).toBe("Test User"); // Trimmed
        });
    });

    describe("Database operations", () => {
        test("should generate unique userID for each user", async () => {
            // Arrange
            const users = [
                {
                    email: "user1@example.com",
                    username: "User 1",
                },
                {
                    email: "user2@example.com",
                    username: "User 2",
                },
                {
                    email: "user3@example.com",
                    username: "User 3",
                },
            ];

            const userIDs = [];

            // Act
            for (const userData of users) {
                const response = await request(app)
                    .post("/")
                    .send(userData)
                    .expect(201);

                userIDs.push(response.body.userID);
            }

            // Assert
            const uniqueIDs = new Set(userIDs);
            expect(uniqueIDs.size).toBe(users.length);

            // Verify all users exist in database
            const usersSnapshot = await db.collection("users").get();
            expect(usersSnapshot.size).toBe(users.length);
        });

        test("should set createdAt timestamp", async () => {
            // Arrange
            const userData = {
                email: "timestamp@example.com",
                username: "Timestamp User",
            };

            const beforeTime = new Date();

            // Act
            const response = await request(app)
                .post("/")
                .send(userData)
                .expect(201);

            const afterTime = new Date();

            // Assert
            const userDoc = await db
                .collection("users")
                .doc(response.body.userID)
                .get();
            const savedUser = userDoc.data();

            expect(savedUser.createdAt).toBeDefined();
            const createdAt = savedUser.createdAt.toDate();
            expect(createdAt).toBeInstanceOf(Date);
            expect(createdAt.getTime()).toBeGreaterThanOrEqual(
                beforeTime.getTime(),
            );
            const delta = Math.abs(createdAt.getTime() - afterTime.getTime());
            expect(delta).toBeLessThanOrEqual(50);
        });
    });
});

// Helper

const clearFirestoreData = async () => {
    const collections = await db.listCollections();
    const deletePromises = collections.map(async (collection) => {
        const snapshot = await collection.get();
        const deletes = snapshot.docs.map((doc) => doc.ref.delete());
        return Promise.all(deletes);
    });
    await Promise.all(deletePromises);
};
