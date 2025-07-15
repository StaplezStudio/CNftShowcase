
"use client";

import React, { useMemo, type FC, type ReactNode, useContext, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RpcContext } from './rpc-provider';

// A default public RPC endpoint to use as a fallback.
const FALLBACK_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { rpcEndpoint } = useContext(RpcContext);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Use the user's configured RPC endpoint if available, otherwise use the fallback.
    // This prevents the app from crashing if the RPC endpoint isn't loaded yet.
    const endpoint = useMemo(() => rpcEndpoint || FALLBACK_RPC_ENDPOINT, [rpcEndpoint]);

    // The new wallet standard automatically discovers installed wallet extensions.
    const wallets = useMemo(() => [], []);

    // We only render the providers once the component has mounted on the client.
    // This prevents hydration mismatches.
    if (!isMounted) {
        return null;
    }

    return (
        <ConnectionProvider endpoint={endpoint} key={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={false}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
