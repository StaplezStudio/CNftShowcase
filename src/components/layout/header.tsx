import { SolanaIcon } from '@/components/icons/solana-icon';
import { WalletConnector } from '@/components/wallet-connector';
import { Button } from '@/components/ui/button';
import { ListPlus } from 'lucide-react';

type HeaderProps = {
  onListAssetClick: () => void;
};

export function Header({ onListAssetClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center space-x-2 sm:space-x-4 px-4 sm:justify-between">
        <div className="flex gap-6 md:gap-10">
          <a href="/" className="flex items-center space-x-2">
            <SolanaIcon className="h-8 w-8" />
            <span className="hidden sm:inline-block font-bold text-2xl font-headline">SolSwapper</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-2">
            <Button onClick={onListAssetClick} size="sm">
              <ListPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">List your Asset</span>
            </Button>
            <WalletConnector />
          </nav>
        </div>
      </div>
    </header>
  );
}
