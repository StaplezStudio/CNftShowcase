
"use client";

import React, { createContext, useState, useMemo, type ReactNode, useEffect, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type RpcContextType = {
  rpcEndpoint: string;
  setRpcEndpoint: (endpoint: string) => void;
};

const defaultRpcEndpoint = 'https://devnet.helius-rpc.com/?api-key=3069a4e2-6bcc-45ee-b0cd-af749153b485';

export const RpcContext = createContext<RpcContextType>({
  rpcEndpoint: defaultRpcEndpoint,
  setRpcEndpoint: () => console.error('RpcProvider not initialized'),
});

export function RpcProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const [rpcEndpoint, setRpcEndpoint] = useState<string>(defaultRpcEndpoint);

  useEffect(() => {
    const loadRpcEndpoint = async () => {
      if (publicKey) {
        try {
          const userConfigDoc = doc(db, 'userConfig', publicKey.toBase58());
          const docSnap = await getDoc(userConfigDoc);
          if (docSnap.exists() && docSnap.data().rpcEndpoint) {
            setRpcEndpoint(docSnap.data().rpcEndpoint);
          } else {
            setRpcEndpoint(defaultRpcEndpoint);
          }
        } catch (error) {
          console.warn("Could not read RPC endpoint from Firestore", error);
          setRpcEndpoint(defaultRpcEndpoint);
        }
      } else {
        // When wallet disconnects, revert to default
        setRpcEndpoint(defaultRpcEndpoint);
      }
    };

    loadRpcEndpoint();
  }, [publicKey]);

  const handleSetRpcEndpoint = async (endpoint: string) => {
    setRpcEndpoint(endpoint); // Update state immediately for responsiveness
    if (publicKey) {
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
    [rpcEndpoint, publicKey] // publicKey is a dependency for handleSetRpcEndpoint
  );

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}


    