"use client";

import React, { type FC, type ReactNode } from 'react';
import { RpcProvider } from './rpc-provider';
import { SolanaWalletProvider } from './solana-wallet-provider';

export const AppProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <RpcProvider>
      <SolanaWalletProvider>{children}</SolanaWalletProvider>
    </RpcProvider>
  );
};
