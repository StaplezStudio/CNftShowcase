"use client";

// This is a mock implementation of the Firebase setup requested by the user.
// In a real application, this file would initialize a real Firebase app.
// The functions here simulate calls to Firebase Cloud Functions.

const httpsCallable = <T, R>(fnName: string) => {
  return async (data: T): Promise<{ data: R }> => {
    console.log(`[Mock Firebase] Calling function "${fnName}" with data:`, data);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    switch (fnName) {
      case 'createDelegateTransaction':
        return {
          data: {
            transaction: Buffer.from(JSON.stringify({
              mockTx: "delegate",
              assetId: (data as any).assetId,
              seller: (data as any).sellerPublicKey,
              timestamp: Date.now()
            })).toString("base64"),
          } as R,
        };

      case 'confirmListing':
        return {
          data: { success: true } as R,
        };

      case 'createPurchaseTransaction':
        return {
          data: {
            transaction: Buffer.from(JSON.stringify({
              mockTx: "purchase",
              assetId: (data as any).assetId,
              buyer: (data as any).buyerPublicKey,
              timestamp: Date.now()
            })).toString("base64"),
          } as R,
        };

      default:
        throw new Error(`[Mock Firebase] Unknown function called: ${fnName}`);
    }
  };
};

type DelegateTxData = { assetId: string; sellerPublicKey: string };
type DelegateTxResponse = { transaction: string };

type ConfirmListerData = { txid: string; assetId: string; price: number };
type ConfirmListerResponse = { success: boolean };

type PurchaseTxData = { assetId: string; buyerPublicKey: string };
type PurchaseTxResponse = { transaction: string };

export const createDelegateTx = httpsCallable<DelegateTxData, DelegateTxResponse>('createDelegateTransaction');
export const confirmLister = httpsCallable<ConfirmListerData, ConfirmListerResponse>('confirmListing');
export const createPurchaseTx = httpsCallable<PurchaseTxData, PurchaseTxResponse>('createPurchaseTransaction');
