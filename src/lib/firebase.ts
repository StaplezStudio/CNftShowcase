
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAVRU2qEvUOYmW-dzM1QxdP0VWRtJlvy4k",
  authDomain: "solswapper-8qwkh.firebaseapp.com",
  projectId: "solswapper-8qwkh",
  storageBucket: "solswapper-8qwkh.appspot.com",
  messagingSenderId: "375681785254",
  appId: "1:375681785254:web:057b35680502b851e0c367"
};

let app: FirebaseApp;
let db: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else if (typeof window !== 'undefined') {
  app = getApp();
  db = getFirestore(app);
}

export { db };
