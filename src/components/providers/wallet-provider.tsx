"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MockWallet {
  publicKey: string | null;
  balance: number;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const MockWalletContext = createContext<MockWallet | undefined>(undefined);

export const MockWalletProvider = ({ children }: { children: ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState(0);

  const connect = useCallback(() => {
    const fakePublicKey = "SoL4" + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    setPublicKey(fakePublicKey);
    setBalance(13.37);
    setIsConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setBalance(0);
    setIsConnected(false);
  }, []);

  const value = { publicKey, balance, isConnected, connect, disconnect };

  return (
    <MockWalletContext.Provider value={value}>
      {children}
    </MockWalletContext.Provider>
  );
};

export const useMockWallet = () => {
  const context = useContext(MockWalletContext);
  if (context === undefined) {
    throw new Error('useMockWallet must be used within a MockWalletProvider');
  }
  return context;
};
