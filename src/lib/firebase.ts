
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- ACTION REQUIRED ---
// 1. Go to your Firebase project console.
// 2. Go to Project Settings > General > Your apps.
// 3. Select your web app and find the Firebase SDK snippet.
// 4. Copy the 'firebaseConfig' object and paste it below, replacing the placeholder.
//
// If you see "client is offline" errors, it means this configuration
// is incorrect or your Firestore security rules are too restrictive.
// For development, ensure your Firestore rules are:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if true;
//     }
//   }
// }
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };

    