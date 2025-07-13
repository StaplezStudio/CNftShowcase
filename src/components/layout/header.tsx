import { SolanaIcon } from '@/components/icons/solana-icon';
import { WalletConnector } from '@/components/wallet-connector';
import { Button } from '@/components/ui/button';
import { ListPlus, Settings } from 'lucide-react';

type HeaderProps = {
  onListAssetClick: () => void;
  onRpcSettingsClick: () => void;
};

export function Header({ onListAssetClick, onRpcSettingsClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center space-x-4 px-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <a href="/" className="flex items-center space-x-2">
            <SolanaIcon className="h-8 w-8" />
            <span className="inline-block font-bold text-2xl font-headline">SolSwapper</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button onClick={onListAssetClick}>
              <ListPlus className="mr-2 h-4 w-4" />
              List your Asset
            </Button>
            <Button onClick={onRpcSettingsClick} variant="outline" size="icon" aria-label="RPC Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <WalletConnector />
          </nav>
        </div>
      </div>
    </header>
  );
}
