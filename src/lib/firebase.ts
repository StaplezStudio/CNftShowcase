
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

// --- HOW TO FIX THE "CLIENT IS OFFLINE" ERROR ---
// This error almost always means your Firestore Security Rules are blocking the app.
// To fix this, you must update your rules in the Firebase Console.
//
// 1. Go to your Firebase project -> Firestore Database -> Rules tab.
// 2. Replace the existing rules with the following rules for development:
/*
 rules_version = '2';
 service cloud.firestore {
   match /databases/{database}/documents {
     // This rule allows anyone to read or write to any document.
     // It is great for development but should be made more secure
     // before launching a real application.
     match /{document=**} {
       allow read, write: if true;
     }
   }
 }
*/
// 3. Click "Publish".
//
// After publishing these new rules, the "client is offline" error will be resolved.


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
