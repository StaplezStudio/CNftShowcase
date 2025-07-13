"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import type { Asset } from '@/components/asset-card';
import { AssetCard } from '@/components/asset-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MockWalletProvider, useMockWallet } from '@/components/providers/wallet-provider';
import { createDelegateTx, confirmLister, createPurchaseTx } from '@/lib/firebase';
import { SolanaIcon } from '@/components/icons/solana-icon';

const MOCK_ASSETS: Asset[] = [
  { id: '1', name: 'Cyber Samurai #1', imageUrl: 'https://placehold.co/400x400.png', price: 2.5, hint: 'cyberpunk warrior' },
  { id: '2', name: 'Galactic Voyager', imageUrl: 'https://placehold.co/400x400.png', price: 1.8, hint: 'space astronaut' },
  { id: '3', name: 'Quantum Feline', imageUrl: 'https://placehold.co/400x400.png', price: 5.1, hint: 'abstract cat' },
  { id: '4', name: 'Solana Sunbather', imageUrl: 'https://placehold.co/400x400.png', price: 3.2, hint: 'beach sunset' },
  { id: '5', name: 'Pixel Pirate', imageUrl: 'https://placehold.co/400x400.png', price: 0.9, hint: 'pixel art' },
  { id: '6', name: 'DeFi Dragon', imageUrl: 'https://placehold.co/400x400.png', price: 7.4, hint: 'fantasy dragon' },
  { id: '7', name: 'Crypto Canvas', imageUrl: 'https://placehold.co/400x400.png', price: 1.2, hint: 'abstract painting' },
  { id: '8', name: 'Code Cubes', imageUrl: 'https://placehold.co/400x400.png', price: 2.0, hint: 'geometric shapes' },
];

export default function Home() {
  const { toast } = useToast();
  const { isConnected, publicKey, connect } = useMockWallet();

  const [isListModalOpen, setListModalOpen] = useState(false);
  const [isBuyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleListAssetClick = () => setListModalOpen(true);

  const handleBuyClick = (asset: Asset) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to purchase an asset.",
        variant: "destructive",
      });
      connect();
      return;
    }
    setSelectedAsset(asset);
    setBuyModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedAsset || !publicKey) return;
    setIsLoading(true);
    try {
      toast({ title: "Processing Transaction", description: "Please wait..." });
      const purchaseResult = await createPurchaseTx({
        assetId: selectedAsset.id,
        buyerPublicKey: publicKey,
      });

      const transaction = JSON.parse(Buffer.from(purchaseResult.data.transaction, 'base64').toString());
      console.log("Buyer received transaction:", transaction);
      await new Promise(res => setTimeout(res, 1500)); 
      console.log("Transaction signed and sent with txid: fakeTxId_" + Math.random());

      toast({
        title: "Purchase Successful!",
        description: `You have successfully purchased ${selectedAsset.name}.`,
        className: "bg-green-600 text-white border-green-600",
      });
    } catch (error) {
      console.error("Error purchasing asset:", error);
      toast({ title: "Purchase Failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setBuyModalOpen(false);
    }
  };

  const handleConfirmListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!publicKey) {
       toast({ title: "Wallet Not Connected", description: "Please connect your wallet.", variant: "destructive" });
       return;
    }

    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const assetId = formData.get('assetId') as string;
    const price = parseFloat(formData.get('price') as string);
    
    try {
        toast({ title: "Creating Listing", description: "Please approve the transaction in your wallet." });

        const result = await createDelegateTx({
            assetId,
            sellerPublicKey: publicKey,
        });

        const txString = result.data.transaction;
        JSON.parse(Buffer.from(txString, 'base64').toString());

        await new Promise(res => setTimeout(res, 1500));
        const fakeTxId = "fakeTxId_delegate_" + Math.random();
        
        await confirmLister({ txid: fakeTxId, assetId, price });

        toast({
            title: "Listing Successful!",
            description: "Your asset is now live on the marketplace.",
            className: "bg-green-600 text-white border-green-600",
        });

    } catch (error) {
        console.error("Error listing NFT:", error);
        toast({ title: "Listing Failed", description: "Could not list your asset.", variant: "destructive" });
    } finally {
        setIsLoading(false);
        setListModalOpen(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col">
      <Header onListAssetClick={handleListAssetClick} />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              The Solana Asset Swap
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Securely trade digital assets with atomic swaps, powered by Solana and Firebase.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {MOCK_ASSETS.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onBuyClick={handleBuyClick} />
            ))}
          </div>
        </section>
      </main>

      <Dialog open={isBuyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase "{selectedAsset?.name}". This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="my-4 flex items-center gap-4">
              <Image src={selectedAsset.imageUrl} alt={selectedAsset.name} width={100} height={100} className="rounded-lg" data-ai-hint={selectedAsset.hint} />
              <div>
                <h3 className="font-semibold text-lg">{selectedAsset.name}</h3>
                <div className="flex items-center gap-2 text-xl font-bold text-primary mt-2">
                  <SolanaIcon className="h-6 w-6" />
                  <span>{selectedAsset.price} SOL</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyModalOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleConfirmPurchase} disabled={isLoading}>
              {isLoading ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isListModalOpen} onOpenChange={setListModalOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>List your Asset</DialogTitle>
                  <DialogDescription>
                      Enter the details of your asset to list it on the marketplace.
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConfirmListing} className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assetId" className="text-right">Asset ID</Label>
                      <Input id="assetId" name="assetId" required className="col-span-3" placeholder="e.g., Your-NFT-Token-Address" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="price" className="text-right">Price (SOL)</Label>
                      <Input id="price" name="price" type="number" step="0.01" required className="col-span-3" placeholder="e.g., 1.5"/>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setListModalOpen(false)} disabled={isLoading}>Cancel</Button>
                      <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Listing..." : "List Asset"}
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
