"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { SolanaIcon } from '@/components/icons/solana-icon';
import { useCallback } from 'react';

export function WalletConnector() {
  const { wallet, connected, connect, disconnect, publicKey, select } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = useCallback(() => {
    if (wallet) {
      connect().catch(() => {
        // Silently catch errors. The user can click again.
      });
    } else {
      setVisible(true);
    }
  }, [wallet, connect, setVisible]);

  if (!connected || !publicKey) {
    return (
      <Button onClick={handleConnect} variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  const truncateKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="bg-card hover:bg-muted">
          {wallet?.adapter.icon && <img src={wallet.adapter.icon} alt={`${wallet.adapter.name} icon`} className="mr-2 h-5 w-5" />}
          {!wallet?.adapter.icon && <SolanaIcon className="mr-2 h-5 w-5" />}
          <span>{truncateKey(publicKey.toBase58())}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm">
          <div className="flex justify-between items-center mt-1">
            <span className="text-muted-foreground">Address</span>
            <span className="font-semibold">{truncateKey(publicKey.toBase58())}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
