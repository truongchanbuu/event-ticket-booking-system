import { db } from "../src/firebase-emulator";

export async function seedUsers() {
    const now = new Date();

    const users = [
        {
            uid: "user1",
            email: "admin@example.com",
            firstName: "Alice",
            lastName: "Admin",
            username: "alice_admin",
            role: "admin",
            status: "active",
            organizerStatus: "approved",
            createdAt: now,
            updatedAt: null,
        },
        {
            uid: "user2",
            email: "john@example.com",
            firstName: "John",
            lastName: "Doe",
            username: "johndoe",
            role: "user",
            status: "inactive",
            organizerStatus: "pending",
            createdAt: new Date(now.getTime() - 86400000), // -1 day
            updatedAt: null,
        },
        {
            uid: "user3",
            email: "mary@organizer.com",
            firstName: "Mary",
            lastName: "Smith",
            username: "mary_events",
            role: "organizer",
            status: "active",
            organizerStatus: "approved",
            createdAt: new Date(now.getTime() - 172800000), // -2 days
            updatedAt: Date.now(),
            organizer: {
                organizerID: "user3",
                name: "Mary Events Co.",
                bio: "We organize music concerts",
            },
        },
    ];

    const batch = db.batch();

    for (const user of users) {
        const ref = db.collection("users").doc(user.uid);
        batch.set(ref, user);
    }

    await batch.commit();
    console.log("✅ Seeded users into Firestore emulator");
}
