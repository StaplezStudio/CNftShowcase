
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SolanaIcon } from '@/components/icons/solana-icon';
import { WalletConnector } from '@/components/wallet-connector';
import { Button } from '@/components/ui/button';
import { Home, Settings, Code } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center space-x-2 sm:space-x-4 px-4 sm:justify-between">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <SolanaIcon className="h-8 w-8" />
            <span className="hidden sm:inline-block font-bold text-2xl font-headline">cNFT Gallery</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-1">
            {pathname !== '/' && (
              <Link href="/">
                <Button variant="ghost" size="icon" aria-label="Home">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
            )}
            {pathname !== '/settings' && (
              <Link href="/settings">
                  <Button variant="ghost" size="icon" aria-label="Settings">
                    <Settings className="h-5 w-5" />
                  </Button>
              </Link>
            )}
             {pathname !== '/developers' && (
              <Link href="/developers">
                  <Button variant="ghost" size="icon" aria-label="Developers">
                    <Code className="h-5 w-5" />
                  </Button>
              </Link>
            )}
            <WalletConnector />
          </nav>
        </div>
      </div>
    </header>
  );
}
