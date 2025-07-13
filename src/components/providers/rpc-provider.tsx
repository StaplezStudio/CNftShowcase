
"use client";

import React, { createContext, useState, useMemo, type ReactNode, useEffect } from 'react';

type RpcContextType = {
  rpcEndpoint: string;
  setRpcEndpoint: (endpoint: string) => void;
};

const defaultRpcEndpoint = 'https://devnet.helius-rpc.com/?api-key=3069a4e2-6bcc-45ee-b0cd-af749153b485';
const RPC_ENDPOINT_STORAGE_KEY = 'solana_rpc_endpoint';

export const RpcContext = createContext<RpcContextType>({
  rpcEndpoint: defaultRpcEndpoint,
  setRpcEndpoint: () => console.error('RpcProvider not initialized'),
});

export function RpcProvider({ children }: { children: ReactNode }) {
  const [rpcEndpoint, setRpcEndpoint] = useState<string>(defaultRpcEndpoint);

  useEffect(() => {
    try {
      const savedEndpoint = localStorage.getItem(RPC_ENDPOINT_STORAGE_KEY);
      if (savedEndpoint) {
        setRpcEndpoint(savedEndpoint);
      }
    } catch (error) {
      console.warn("Could not read RPC endpoint from localStorage", error);
    }
  }, []);

  const handleSetRpcEndpoint = (endpoint: string) => {
    try {
      localStorage.setItem(RPC_ENDPOINT_STORAGE_KEY, endpoint);
      setRpcEndpoint(endpoint);
    } catch (error) {
      console.warn("Could not save RPC endpoint to localStorage", error);
      // Still update in-memory state even if localStorage fails
      setRpcEndpoint(endpoint);
    }
  };


  const value = useMemo(
    () => ({ rpcEndpoint, setRpcEndpoint: handleSetRpcEndpoint }),
    [rpcEndpoint]
  );

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}
