
"use client";

import React, { createContext, useState, useMemo, type ReactNode, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firestore';

type RpcContextType = {
  rpcEndpoint: string;
  setRpcEndpoint: (endpoint: string) => void;
};

const DEFAULT_RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=3069a4e2-6bcc-45ee-b0cd-af749153b485';

export const RpcContext = createContext<RpcContextType>({
  rpcEndpoint: DEFAULT_RPC_ENDPOINT,
  setRpcEndpoint: () => console.error('RpcProvider not initialized'),
});

export function RpcProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const db = useFirestore();
  const [rpcEndpoint, setRpcEndpoint] = useState<string>(DEFAULT_RPC_ENDPOINT);

  useEffect(() => {
    const loadRpcEndpoint = async () => {
      // Revert to default when wallet disconnects
      if (!publicKey || !db) {
        setRpcEndpoint(DEFAULT_RPC_ENDPOINT);
        return;
      }
      
      try {
        const userConfigDoc = doc(db, 'userConfig', publicKey.toBase58());
        const docSnap = await getDoc(userConfigDoc);
        if (docSnap.exists() && docSnap.data().rpcEndpoint) {
          setRpcEndpoint(docSnap.data().rpcEndpoint);
        } else {
          setRpcEndpoint(DEFAULT_RPC_ENDPOINT);
        }
      } catch (error) {
        console.warn("Could not read RPC endpoint from Firestore, using default.", error);
        setRpcEndpoint(DEFAULT_RPC_ENDPOINT);
      }
    };

    loadRpcEndpoint();
  }, [publicKey, db]);

  const handleSetRpcEndpoint = async (endpoint: string) => {
    setRpcEndpoint(endpoint); // Update state immediately for responsiveness
    if (publicKey && db) {
      try {
        const userConfigDoc = doc(db, 'userConfig', publicKey.toBase58());
        await setDoc(userConfigDoc, { rpcEndpoint: endpoint }, { merge: true });
      } catch (error) {
        console.warn("Could not save RPC endpoint to Firestore", error);
      }
    }
  };

  const value = useMemo(
    () => ({ rpcEndpoint, setRpcEndpoint: handleSetRpcEndpoint }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rpcEndpoint, publicKey, db] // publicKey and db are dependencies for handleSetRpcEndpoint
  );

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}

    