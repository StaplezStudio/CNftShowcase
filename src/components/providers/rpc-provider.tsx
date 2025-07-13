"use client";

import React, { createContext, useState, useMemo, type ReactNode } from 'react';

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
  const [rpcEndpoint, setRpcEndpoint] = useState<string>(defaultRpcEndpoint);

  const value = useMemo(
    () => ({ rpcEndpoint, setRpcEndpoint }),
    [rpcEndpoint]
  );

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}
