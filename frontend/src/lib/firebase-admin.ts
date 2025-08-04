import config from "@/config";
import { App, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { credential } from "firebase-admin";

if (!config.firebase_key) {
  throw new Error(
    "Firebase service account credentials are not set in .env.local"
  );
}

const serviceAccount = JSON.parse(
  Buffer.from(config.firebase_key!, "base64").toString("ascii")
);

let firebaseAdminApp: App;

export const initializeFirebaseAdmin = () => {
  if (!getApps().length) {
    firebaseAdminApp = initializeApp({
      credential: credential.cert(serviceAccount),
    });
    console.log("[Firebase Admin] Initialized successfully.");
  }
  return firebaseAdminApp;
};

export const auth = () => {
  initializeFirebaseAdmin(); // Đảm bảo app đã được khởi tạo
  return getAuth();
};
