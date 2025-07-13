"use client";

import React, { createContext, useState, useMemo, type ReactNode } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

type RpcContextType = {
  rpcEndpoint: string;
  setRpcEndpoint: (endpoint: string) => void;
};

export const RpcContext = createContext<RpcContextType>({
  rpcEndpoint: clusterApiUrl(WalletAdapterNetwork.Devnet),
  setRpcEndpoint: () => console.error('RpcProvider not initialized'),
});

export function RpcProvider({ children }: { children: ReactNode }) {
  const [rpcEndpoint, setRpcEndpoint] = useState<string>(
    clusterApiUrl(WalletAdapterNetwork.Devnet)
  );

  const value = useMemo(
    () => ({ rpcEndpoint, setRpcEndpoint }),
    [rpcEndpoint]
  );

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>;
}
