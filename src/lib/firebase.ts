"use client";

// This file is no longer used for core transaction logic, which has been
// moved to page.tsx to directly use the wallet adapter.
// It is kept here to represent a potential future state where real
// Cloud Functions would be called.

export const createDelegateTx = () => Promise.resolve();
export const confirmLister = () => Promise.resolve();
export const createPurchaseTx = () => Promise.resolve();
