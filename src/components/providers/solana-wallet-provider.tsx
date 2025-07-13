"use client";

import React, { useMemo, type FC, type ReactNode, useContext } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { RpcContext } from './rpc-provider';

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { rpcEndpoint } = useContext(RpcContext);
    const network = WalletAdapterNetwork.Devnet;

    // The endpoint is now reactive to changes in RpcContext.
    // The key on ConnectionProvider ensures it re-initializes when the endpoint changes.
    const endpoint = useMemo(() => rpcEndpoint, [rpcEndpoint]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint} key={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
