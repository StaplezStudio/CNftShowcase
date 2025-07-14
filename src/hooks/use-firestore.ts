
"use client";

import { useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from '@/lib/firebase';

// A hook to safely initialize and get the Firestore instance on the client side.
export function useFirestore(): Firestore {
  const db = useMemo(() => {
    if (typeof window === 'undefined') {
      // This should ideally not be reached if used correctly in client components,
      // but serves as a safeguard.
      return null;
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
  }, []);

  if (!db) {
    // This will only happen on the server or if initialization fails,
    // preventing downstream errors. Components should handle this null case if necessary.
    // However, since it's a client hook, this is mostly a type guard.
    return null as never;
  }

  return db;
}
