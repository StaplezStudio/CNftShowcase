"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import type { Asset } from '@/components/asset-card';
import { AssetCard } from '@/components/asset-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SolanaIcon } from '@/components/icons/solana-icon';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

// This acts as a centralized database of all potential NFTs in the prototype ecosystem.
// In a real app, this data would come from a database or the blockchain itself.
const ALL_POSSIBLE_ASSETS = new Map<string, Omit<Asset, 'price'>>([
  ['1', { id: '1', name: 'Cyber Samurai #1', imageUrl: 'https://placehold.co/400x400.png', hint: 'cyberpunk warrior' }],
  ['2', { id: '2', name: 'Galactic Voyager', imageUrl: 'https://placehold.co/400x400.png', hint: 'space astronaut' }],
  ['3', { id: '3', name: 'Quantum Feline', imageUrl: 'https://placehold.co/400x400.png', hint: 'abstract cat' }],
  ['4', { id: '4', name: 'Solana Sunbather', imageUrl: 'https://placehold.co/400x400.png', hint: 'beach sunset' }],
  ['5', { id: '5', name: 'Pixel Pirate', imageUrl: 'https://placehold.co/400x400.png', hint: 'pixel art' }],
  ['6', { id: '6', name: 'DeFi Dragon', imageUrl: 'https://placehold.co/400x400.png', hint: 'fantasy dragon' }],
  ['7', { id: '7', name: 'Crypto Canvas', imageUrl: 'https://placehold.co/400x400.png', hint: 'abstract painting' }],
  ['8', { id: '8', name: 'Code Cubes', imageUrl: 'https://placehold.co/400x400.png', hint: 'geometric shapes' }],
]);


// Mock in-memory DB for sales. Maps asset ID to its sale info.
const salesDB = new Map<string, { price: number, seller: string }>();

// Simple type for the fetched assets. In a real app, this would be more robust.
type UserNFT = {
  id: string;
  name: string;
  imageUrl?: string;
  hint?: string;
};

export default function Home() {
  const { toast } = useToast();
  const { connection } = useConnection();
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const [isListModalOpen, setListModalOpen] = useState(false);
  const [isBuyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNfts, setIsFetchingNfts] = useState(false);
  const [userNfts, setUserNfts] = useState<UserNFT[]>([]);
  const [selectedNft, setSelectedNft] = useState<string | null>(null);

  const [listedAssets, setListedAssets] = useState<Asset[]>([]);

  // Effect to update the marketplace listings when the salesDB changes
  useEffect(() => {
    const assetsForSale: Asset[] = [];
    for (const [id, saleInfo] of salesDB.entries()) {
      // Find the asset's base info from our "master list" or user's fetched NFTs
      let assetInfo = ALL_POSSIBLE_ASSETS.get(id) || userNfts.find(nft => nft.id === id);
      
      if (assetInfo) {
        assetsForSale.push({
          ...assetInfo,
          id, // ensure id is a string
          price: saleInfo.price,
        });
      }
    }
    setListedAssets(assetsForSale);
  }, [userNfts]); // Rerun when userNfts updates in case new assets are added to ALL_POSSIBLE_ASSETS

  const fetchUserNfts = async () => {
    if (!publicKey) return;
    setIsFetchingNfts(true);
    setUserNfts([]);
    try {
        const response = await fetch(connection.rpcEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAssetsByOwner',
                params: {
                    ownerAddress: publicKey.toBase58(),
                    sortBy: {
                        sortBy: "created",
                        sortDirection: "asc",
                    },
                    limit: 1000,
                    page: 1,
                    displayOptions: {
                        showUnverifiedCollections: true,
                        showCollectionMetadata: true,
                        showFungible: false,
                        showNativeBalance: false,
                        showInscription: false,
                    },
                },
            }),
        });

        const { result } = await response.json();
        if (result && result.items) {
          const fetchedNfts: UserNFT[] = result.items
              .filter((asset: any) => asset.compression.compressed && asset.content.metadata.name)
              .map((asset: any) => ({
                  id: asset.id,
                  name: asset.content.metadata.name,
                  imageUrl: asset.content.links?.image,
                  hint: 'user asset', // Add a default hint
              }));

          setUserNfts(fetchedNfts);
           // Add any newly discovered NFTs to our master list for display purposes
          fetchedNfts.forEach(nft => {
            if (!ALL_POSSIBLE_ASSETS.has(nft.id)) {
              ALL_POSSIBLE_ASSETS.set(nft.id, { id: nft.id, name: nft.name, imageUrl: nft.imageUrl || 'https://placehold.co/400x400.png', hint: nft.hint || 'user asset' });
            }
          });

          if (fetchedNfts.length === 0) {
              toast({ title: "No cNFTs Found", description: "Your wallet doesn't seem to hold any compressed NFTs on Devnet." });
          }
        } else {
            setUserNfts([]);
            toast({ title: "No cNFTs Found", description: "Your wallet doesn't seem to hold any compressed NFTs on Devnet." });
        }
    } catch (error) {
        console.error("Error fetching cNFTs:", error);
        toast({ title: "Failed to fetch NFTs", description: "Could not retrieve your cNFTs from the network.", variant: "destructive" });
    } finally {
        setIsFetchingNfts(false);
    }
  };

  useEffect(() => {
    if (isListModalOpen && connected) {
      fetchUserNfts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListModalOpen, connected]);


  const handleListAssetClick = () => {
    if (!connected) {
       toast({ title: "Wallet Not Connected", description: "Please connect your wallet to list an asset.", variant: "destructive" });
       setWalletModalVisible(true);
       return
    }
    setListModalOpen(true)
  };

  const handleBuyClick = (asset: Asset) => {
    if (!connected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to purchase an asset.",
        variant: "destructive",
      });
      setWalletModalVisible(true);
      return;
    }
    setSelectedAsset(asset);
    setBuyModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedAsset || !publicKey || !sendTransaction) return;
    setIsLoading(true);
    
    try {
      const saleInfo = salesDB.get(selectedAsset.id);
      if (!saleInfo) {
        throw new Error("Sale not found for this asset.");
      }

      toast({ title: "Processing Transaction", description: "Please approve the transaction in your wallet." });
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(saleInfo.seller),
          lamports: saleInfo.price * 1_000_000_000, // Convert SOL to lamports
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      const txid = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(txid, 'confirmed');

      // Remove from sale after purchase
      salesDB.delete(selectedAsset.id);
      setListedAssets(prev => prev.filter(asset => asset.id !== selectedAsset.id));


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
    if (!publicKey || !signTransaction) {
       toast({ title: "Wallet Not Connected", description: "Please connect your wallet.", variant: "destructive" });
       return;
    }

    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const price = parseFloat(formData.get('price') as string);
    const assetId = selectedNft; // Use the state for the selected NFT

    if (!assetId) {
        toast({ title: "No Asset Selected", description: "Please select an asset to list.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    try {
        toast({ title: "Creating Listing", description: "Please approve the transaction in your wallet." });

        // In a real app, this tx would lock the asset in a smart contract.
        // For this prototype, we'll just sign a "dummy" transaction.
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: publicKey, // Sending to self as a placeholder
                lamports: 1000, // Minimal lamports to make it a valid tx
            })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const signedTx = await signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(txid, 'confirmed');
        
        // Mock DB update
        salesDB.set(assetId, { price, seller: publicKey.toBase58() });
        
        // Manually trigger the effect to update the UI
        const assetInfo = ALL_POSSIBLE_ASSETS.get(assetId);
        if (assetInfo) {
          setListedAssets(prev => [...prev, { ...assetInfo, price }]);
        }

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
        setSelectedNft(null);
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

          {listedAssets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listedAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} onBuyClick={handleBuyClick} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-2xl font-semibold">No assets for sale</h2>
              <p className="mt-2 text-muted-foreground">Check back later or list one of your own assets!</p>
            </div>
          )}

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
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>List your Asset</DialogTitle>
                  <DialogDescription>
                      Select one of your cNFTs to list it on the marketplace.
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConfirmListing} className="grid gap-6 py-4">
                  <div className="grid gap-2">
                      <Label>Select an Asset</Label>
                      <ScrollArea className="h-72 w-full rounded-md border">
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {isFetchingNfts && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
                          {!isFetchingNfts && userNfts.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                              No compressed NFTs found in your wallet.
                            </div>
                          )}
                          {userNfts.map(nft => (
                            <Card 
                              key={nft.id} 
                              onClick={() => setSelectedNft(nft.id)}
                              className={`cursor-pointer transition-all ${selectedNft === nft.id ? 'ring-2 ring-primary' : ''}`}
                            >
                              <div className="aspect-square relative w-full">
                                {nft.imageUrl ? (
                                    <Image src={nft.imageUrl} alt={nft.name} fill className="object-cover rounded-t-md" sizes="150px" />
                                ) : (
                                    <div className="h-full w-full bg-muted rounded-t-md flex items-center justify-center">
                                      <SolanaIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                              </div>
                              <div className="p-2 text-sm">
                                <p className="font-medium truncate">{nft.name}</p>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="price" className="text-right">Price (SOL)</Label>
                      <Input id="price" name="price" type="number" step="0.01" required className="col-span-3" placeholder="e.g., 1.5"/>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => { setListModalOpen(false); setSelectedNft(null); }} disabled={isLoading}>Cancel</Button>
                      <Button type="submit" disabled={isLoading || isFetchingNfts || !selectedNft}>
                          {isLoading ? "Listing..." : "List Asset"}
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
