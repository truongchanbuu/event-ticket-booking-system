import firebaseAdmin from "firebase-admin";
import serviceAccount from "../../firebase/serviceAccountKey.json" with { type: "json" };

const admin = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const serverTimestamp = firebaseAdmin.firestore.FieldValue.serverTimestamp();

export { admin, db, serverTimestamp };
