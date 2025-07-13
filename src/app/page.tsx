
"use client";

import { useState, useEffect, useContext } from 'react';
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
import { RpcContext } from '@/components/providers/rpc-provider';
import { Settings } from 'lucide-react';

const ALLOWED_LISTER_ADDRESS = '8iYEMxwd4MzZWjfke72Pqb18jyUcrbL4qLpHNyBYiMZ2';

// This acts as a centralized database of all potential NFTs in the prototype ecosystem.
// In a real app, this data would come from a database or the blockchain itself.
const ALL_POSSIBLE_ASSETS = new Map<string, Omit<Asset, 'price'>>();

// This will now be a simple in-memory map for the prototype's state.
// In a real app, this would be a database.
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
  const { rpcEndpoint, setRpcEndpoint } = useContext(RpcContext);
  
  // Use state for listedAssets, initialized as empty.
  const [listedAssets, setListedAssets] = useState<Asset[]>([]);

  const [isListModalOpen, setListModalOpen] = useState(false);
  const [isBuyModalOpen, setBuyModalOpen] = useState(false);
  const [isRpcModalOpen, setRpcModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNfts, setIsFetchingNfts] = useState(false);
  const [userNfts, setUserNfts] = useState<UserNFT[]>([]);
  const [selectedNft, setSelectedNft] = useState<string | null>(null);

  // This function will now be responsible for updating the UI from the in-memory salesDB
  const refreshListings = () => {
    const assetsForSale: Asset[] = [];
    for (const [id, saleInfo] of salesDB.entries()) {
      const assetInfo = ALL_POSSIBLE_ASSETS.get(id);
      
      if (assetInfo) {
        assetsForSale.push({
          ...assetInfo,
          id,
          price: saleInfo.price,
        });
      }
    }
    setListedAssets(assetsForSale);
  };

  // Initial load
  useEffect(() => {
    refreshListings();
  }, []);


  const fetchUserNfts = async () => {
    if (!publicKey) return;
    setIsFetchingNfts(true);
    setUserNfts([]);
    try {
        const response = await fetch(rpcEndpoint, {
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
              .filter((asset: any) => asset.compression?.compressed && asset.content?.metadata?.name)
              .map((asset: any) => ({
                  id: asset.id,
                  name: asset.content.metadata.name,
                  imageUrl: asset.content.links?.image || `https://placehold.co/400x400.png`,
                  hint: 'user asset',
              }));

          setUserNfts(fetchedNfts);
           // Add any newly discovered NFTs to our master list for display purposes
          fetchedNfts.forEach(nft => {
            if (!ALL_POSSIBLE_ASSETS.has(nft.id)) {
              ALL_POSSIBLE_ASSETS.set(nft.id, { id: nft.id, name: nft.name, imageUrl: nft.imageUrl || `https://placehold.co/400x400.png`, hint: nft.hint || 'user asset' });
            }
          });
        } else {
            setUserNfts([]);
        }
    } catch (error) {
        console.error("Error fetching cNFTs:", error);
        toast({ title: "Failed to fetch NFTs", description: "Could not retrieve your cNFTs. Please check your RPC settings.", variant: "destructive" });
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
    if (!connected || !publicKey) {
       toast({ title: "Wallet Not Connected", description: "Please connect your wallet to list an asset.", variant: "destructive" });
       setWalletModalVisible(true);
       return
    }

    if (publicKey.toBase58() !== ALLOWED_LISTER_ADDRESS) {
        toast({
            title: "Listing Restricted",
            description: "Only the designated wallet can list new assets.",
            variant: "destructive",
        });
        return;
    }

    setListModalOpen(true)
  };

  const handleRpcSettingsClick = () => {
    setRpcModalOpen(true);
  };
  
  const handleSaveRpc = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newRpcEndpoint = formData.get('rpc') as string;

    try {
      new URL(newRpcEndpoint);
      setRpcEndpoint(newRpcEndpoint);
      toast({
        title: 'RPC Endpoint Updated',
        description: 'The RPC endpoint has been successfully updated.',
        className: "bg-green-600 text-white border-green-600",
      });
      setRpcModalOpen(false);
    } catch (error) {
      toast({
        title: 'Invalid RPC URL',
        description: 'Please enter a valid URL for the RPC endpoint.',
        variant: 'destructive',
      });
    }
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
      
      // In a real app, this transaction would be much more complex.
      // It would involve a smart contract that atomically swaps the cNFT for the SOL.
      // For this prototype, we simulate the swap by transferring SOL to the seller
      // and then updating our local state to reflect the "transfer" of the NFT.
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

      // The cNFT "transfer" is simulated by removing it from the sale database.
      salesDB.delete(selectedAsset.id);
      refreshListings();

      toast({
        title: "Purchase Successful!",
        description: `You have successfully acquired ${selectedAsset.name}. It has been removed from the marketplace.`,
        className: "bg-green-600 text-white border-green-600",
      });
    } catch (error) {
      console.error("Error purchasing asset:", error);
      toast({ title: "Purchase Failed", description: "The transaction could not be completed.", variant: "destructive" });
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
    const assetId = selectedNft;

    if (!assetId) {
        toast({ title: "No Asset Selected", description: "Please select an asset to list.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    try {
        toast({ title: "Creating Listing", description: "Please approve the transaction in your wallet." });

        // This is a placeholder transaction to trigger a wallet signature.
        // In a real app, this would be a transaction to delegate authority
        // of the cNFT to an escrow smart contract.
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: publicKey,
                lamports: 1000, // A nominal fee to create a real transaction
            })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const signedTx = await signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(txid, 'confirmed');
        
        // Add the asset to our in-memory "for sale" database.
        salesDB.set(assetId, { price, seller: publicKey.toBase58() });
        refreshListings();

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
      <Header onListAssetClick={handleListAssetClick} onRpcSettingsClick={handleRpcSettingsClick} />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              The Solana Asset Swap
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Securely trade digital assets with atomic swaps, powered by Solana.
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
                              <p>No compressed NFTs found in your wallet.</p>
                              <p className="text-sm mt-2">Please ensure your RPC endpoint is set correctly for the network you're using (e.g., Devnet).</p>
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
                                    <Image src={nft.imageUrl} alt={nft.name} fill className="object-cover rounded-t-md" sizes="150px" data-ai-hint={nft.hint} />
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
      
      <Dialog open={isRpcModalOpen} onOpenChange={setRpcModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RPC Settings</DialogTitle>
            <DialogDescription>
              Set a custom RPC endpoint to connect to the Solana network.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRpc} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rpc" className="text-right">
                RPC URL
              </Label>
              <Input
                id="rpc"
                name="rpc"
                defaultValue={rpcEndpoint}
                className="col-span-3"
                placeholder="https://api.devnet.solana.com"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setRpcModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
