
"use client";

import React, { createContext, useState, useMemo, type ReactNode, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firestore';

type RpcContextType = {
  rpcEndpoint: string;
  setRpcEndpoint: (endpoint: string) => void;
  savedRpcEndpoints: string[];
  addRpcEndpoint: (endpoint: string) => Promise<void>;
};

const DEFAULT_RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=3069a4e2-6bcc-45ee-b0cd-af749153b485';

export const RpcContext = createContext<RpcContextType>({
  rpcEndpoint: DEFAULT_RPC_ENDPOINT,
  setRpcEndpoint: () => console.error('RpcProvider not initialized'),
  savedRpcEndpoints: [],
  addRpcEndpoint: () => Promise.reject(new Error('RpcProvider not initialized')),
});

export function RpcProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const db = useFirestore();
  const [activeRpc, setActiveRpc] = useState<string>(DEFAULT_RPC_ENDPOINT);
  const [savedEndpoints, setSavedEndpoints] = useState<string[]>([DEFAULT_RPC_ENDPOINT]);

  const loadRpcConfig = useCallback(async () => {
    if (!publicKey || !db) {
      setActiveRpc(DEFAULT_RPC_ENDPOINT);
      setSavedEndpoints([DEFAULT_RPC_ENDPOINT]);
      return;
    }

    try {
      const userConfigDocRef = doc(db, 'userConfig', publicKey.toBase58());
      const docSnap = await getDoc(userConfigDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const loadedEndpoints = data.savedRpcEndpoints && data.savedRpcEndpoints.length > 0
          ? [DEFAULT_RPC_ENDPOINT, ...data.savedRpcEndpoints.filter((e: string) => e !== DEFAULT_RPC_ENDPOINT)]
          : [DEFAULT_RPC_ENDPOINT];
        setSavedEndpoints(loadedEndpoints);
        
        // Set active RPC to last saved active one, or default
        setActiveRpc(data.activeRpcEndpoint || DEFAULT_RPC_ENDPOINT);
      } else {
        // No config found, use defaults
        setActiveRpc(DEFAULT_RPC_ENDPOINT);
        setSavedEndpoints([DEFAULT_RPC_ENDPOINT]);
      }
    } catch (error) {
      console.warn("Could not read RPC config from Firestore, using default.", error);
      setActiveRpc(DEFAULT_RPC_ENDPOINT);
      setSavedEndpoints([DEFAULT_RPC_ENDPOINT]);
    }
  }, [publicKey, db]);

  useEffect(() => {
    loadRpcConfig();
  }, [loadRpcConfig]);

  const handleSetActiveRpc = async (endpoint: string) => {
    setActiveRpc(endpoint); // Update state immediately for responsiveness
    if (publicKey && db) {
      try {
        const userConfigDoc = doc(db, 'userConfig', publicKey.toBase58());
        // Save the currently active RPC for the next session
        await setDoc(userConfigDoc, { activeRpcEndpoint: endpoint }, { merge: true });
      } catch (error) {
        console.warn("Could not save active RPC endpoint to Firestore", error);
      }
    }
  };

  const handleAddRpcEndpoint = async (endpoint: string) => {
    if (!publicKey || !db) {
      throw new Error("Wallet not connected or database unavailable.");
    }
    if (savedEndpoints.includes(endpoint)) {
      throw new Error("This RPC endpoint is already saved.");
    }

    try {
      const userConfigDoc = doc(db, 'userConfig', publicKey.toBase58());
      await setDoc(userConfigDoc, {
        savedRpcEndpoints: arrayUnion(endpoint)
      }, { merge: true });
      // Refresh local state after successful save
      await loadRpcConfig();
    } catch (error) {
      console.error("Could not save new RPC endpoint to Firestore", error);
      throw new Error("Failed to save the new RPC endpoint.");
    }
  };

  const value = useMemo(
    () => ({
      rpcEndpoint: activeRpc,
      setRpcEndpoint: handleSetActiveRpc,
      savedRpcEndpoints: savedEndpoints,
      addRpcEndpoint: handleAddRpcEndpoint,
    }),
    [activeRpc, savedEndpoints, handleAddRpcEndpoint]
  );

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}
