
"use client";

import React, { useMemo, type FC, type ReactNode, useContext } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { RpcContext } from './rpc-provider';

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { rpcEndpoint } = useContext(RpcContext);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    // Only establish a connection provider if the user has set an RPC endpoint.
    // This enforces the "bring your own RPC" policy.
    if (!rpcEndpoint) {
        return (
            <WalletProvider wallets={wallets} autoConnect={false}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        );
    }
    
    return (
        <ConnectionProvider endpoint={rpcEndpoint} key={rpcEndpoint}>
            <WalletProvider wallets={wallets} autoConnect={false}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
