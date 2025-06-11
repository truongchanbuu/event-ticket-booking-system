import firebaseAdmin from "firebase-admin";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:9098";

let adminApp;
if (!firebaseAdmin.apps?.length) {
    adminApp = firebaseAdmin.initializeApp({
        projectId: "event-ticket-booking-sys-44eb4",
    });
    console.log("✅ Firebase Admin initialized");
} else {
    adminApp = firebaseAdmin.app();
}

const db = adminApp.firestore();

const serverTimestamp = firebaseAdmin.firestore.FieldValue.serverTimestamp();

export { adminApp as admin, db, serverTimestamp };
