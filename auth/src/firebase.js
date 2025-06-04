import firebaseAdmin from "firebase-admin";
import serviceAccount from "../../firebase/serviceAccountKey.json" with { type: "json" };

const admin = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export { admin, db };
