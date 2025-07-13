
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace this with your own Firebase project configuration
// You can get this from the Firebase console:
// Project Settings > General > Your apps > Web app > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- TROUBLESHOOTING "CLIENT IS OFFLINE" ERROR ---
// If you see a "client is offline" error, it's almost always one of two things:
// 1. The `firebaseConfig` above is incorrect or has not been replaced with your actual project keys.
// 2. Your Firestore Security Rules are too restrictive. For development, you need to allow reads and writes.
//
// To fix this, go to your Firebase project -> Firestore Database -> Rules tab and set your rules to:
/*
 rules_version = '2';
 service cloud.firestore {
   match /databases/{database}/documents {
     match /{document=**} {
       allow read, write: if true;
     }
   }
 }
*/
// This will open up your database for development. Remember to secure it before going to production!


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
