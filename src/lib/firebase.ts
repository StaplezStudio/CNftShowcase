
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration - THIS IS CRITICAL
const firebaseConfig = {
  apiKey: "AIzaSyAVRU2qEvUOYmW-dzM1QxdP0VWRtJlvy4k",
  authDomain: "solswapper-8qwkh.firebaseapp.com",
  projectId: "solswapper-8qwkh",
  storageBucket: "solswapper-8qwkh.appspot.com",
  messagingSenderId: "375681785254",
  appId: "1:375681785254:web:057b35680502b851e0c367"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
