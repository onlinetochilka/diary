/**
 * firebase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase initialization for Точилка.
 * Uses real project credentials.
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDX4C45a-fQDcmaXk6UycAYTmNRXFJzCBs",
  authDomain:        "repetitor-76c6f.firebaseapp.com",
  projectId:         "repetitor-76c6f",
  storageBucket:     "repetitor-76c6f.firebasestorage.app",
  messagingSenderId: "315167550049",
  appId:             "1:315167550049:web:d76f175420fd9cfa4a1820",
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
export default app;
