
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

const NO_RPC_ENDPOINT = '';

export const RpcContext = createContext<RpcContextType>({
  rpcEndpoint: NO_RPC_ENDPOINT,
  setRpcEndpoint: () => console.error('RpcProvider not initialized'),
  savedRpcEndpoints: [],
  addRpcEndpoint: () => Promise.reject(new Error('RpcProvider not initialized')),
});

export function RpcProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const db = useFirestore();
  const [activeRpc, setActiveRpc] = useState<string>(NO_RPC_ENDPOINT);
  const [savedEndpoints, setSavedEndpoints] = useState<string[]>([]);

  const loadRpcConfig = useCallback(async () => {
    if (!publicKey || !db) {
      setActiveRpc(NO_RPC_ENDPOINT);
      setSavedEndpoints([]);
      return;
    }

    try {
      const userConfigDocRef = doc(db, 'userConfig', publicKey.toBase58());
      const docSnap = await getDoc(userConfigDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const loadedEndpoints = data.savedRpcEndpoints && Array.isArray(data.savedRpcEndpoints)
          ? data.savedRpcEndpoints
          : [];
        setSavedEndpoints(loadedEndpoints);
        
        // Use the saved active endpoint, or the first in the list, or none.
        setActiveRpc(data.activeRpcEndpoint || loadedEndpoints[0] || NO_RPC_ENDPOINT);
      } else {
        // New user, no config yet
        setActiveRpc(NO_RPC_ENDPOINT);
        setSavedEndpoints([]);
      }
    } catch (error) {
      console.warn("Could not read RPC config from Firestore, using default.", error);
      setActiveRpc(NO_RPC_ENDPOINT);
      setSavedEndpoints([]);
    }
  }, [publicKey, db]);

  useEffect(() => {
    if (connected) {
        loadRpcConfig();
    } else {
        // Reset when wallet disconnects
        setActiveRpc(NO_RPC_ENDPOINT);
        setSavedEndpoints([]);
    }
  }, [connected, loadRpcConfig]);

  const handleSetActiveRpc = async (endpoint: string) => {
    setActiveRpc(endpoint); 
    if (publicKey && db) {
      try {
        const userConfigDoc = doc(db, 'userConfig', publicKey.toBase58());
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
      // Atomically add the new endpoint
      await setDoc(userConfigDoc, {
        savedRpcEndpoints: arrayUnion(endpoint)
      }, { merge: true });
      
      // After adding, set it as active
      await setDoc(userConfigDoc, { activeRpcEndpoint: endpoint }, { merge: true });
      setActiveRpc(endpoint);

      await loadRpcConfig(); // Reload to get the freshest state
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
