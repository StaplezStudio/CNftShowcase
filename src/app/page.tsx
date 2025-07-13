
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
import { Transaction, SystemProgram, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { createTransferInstruction } from '@metaplex-foundation/mpl-bubblegum';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RpcContext } from '@/components/providers/rpc-provider';


const ALLOWED_LISTER_ADDRESS = '8iYEMxwd4MzZWjfke72Pqb18jyUcrbL4qLpHNyBYiMZ2';
// In a real app, this would be a secure keypair on a server.
// For this demo, we use a hardcoded public key to represent the marketplace's authority.
const MARKETPLACE_AUTHORITY = new PublicKey('4E25v5s27kE8zLSyA3pGh25k2y8iC3oE9E1FzG9aZ3gB');


type SaleInfo = {
  price: number;
  seller: string;
  compression: any;
  name: string;
  imageUrl: string;
  hint: string;
}

// Use localStorage to persist sales data
const getSalesDB = (): Map<string, SaleInfo> => {
  if (typeof window === 'undefined') {
    return new Map();
  }
  const saved = localStorage.getItem('salesDB');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // The stored value is an array of [key, value] pairs
      return new Map(parsed);
    } catch (e) {
      console.error("Failed to parse salesDB from localStorage", e);
      return new Map();
    }
  }
  return new Map();
};

const setSalesDB = (db: Map<string, SaleInfo>) => {
   if (typeof window === 'undefined') return;
  // Convert Map to array of [key, value] pairs for JSON serialization
  const array = Array.from(db.entries());
  localStorage.setItem('salesDB', JSON.stringify(array));
};

// Simple type for the fetched assets. In a real app, this would be more robust.
type UserNFT = {
  id: string;
  name: string;
  imageUrl?: string;
  hint?: string;
  compression: any;
};


export default function Home() {
  const { toast } = useToast();
  const { connection } = useConnection();
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { rpcEndpoint, setRpcEndpoint } = useContext(RpcContext);
  
  const [salesDB, setSalesDBState] = useState(new Map<string, SaleInfo>());
  const [listedAssets, setListedAssets] = useState<Asset[]>([]);

  const [isListModalOpen, setListModalOpen] = useState(false);
  const [isBuyModalOpen, setBuyModalOpen] = useState(false);
  const [isRpcModalOpen, setRpcModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNfts, setIsFetchingNfts] = useState(false);
  const [userNfts, setUserNfts] = useState<UserNFT[]>([]);
  const [selectedNft, setSelectedNft] = useState<UserNFT | null>(null);
  
  const updateSalesDB = (newDB: Map<string, SaleInfo>) => {
    setSalesDB(newDB);
    setSalesDBState(new Map(newDB));
  };


  const refreshListings = () => {
    const currentSalesDB = getSalesDB();
    const assetsForSale: Asset[] = [];
    
    for (const [id, saleInfo] of currentSalesDB.entries()) {
        assetsForSale.push({
            id,
            price: saleInfo.price,
            name: saleInfo.name,
            imageUrl: saleInfo.imageUrl,
            hint: saleInfo.hint,
        });
    }

    setListedAssets(assetsForSale);
    setSalesDBState(currentSalesDB);
  };

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
                  compression: asset.compression,
              }));

          setUserNfts(fetchedNfts);
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
  
    const getAssetProof = async (assetId: string): Promise<any> => {
        const response = await fetch(rpcEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAssetProof',
                params: { id: assetId },
            }),
        });
        const { result } = await response.json();
        return result;
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
        description: "Please connect to purchase an asset.",
        variant: "destructive",
      });
      setWalletModalVisible(true);
      return;
    }
    setSelectedAsset(asset);
    setBuyModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedAsset || !publicKey || !signTransaction) {
      toast({ title: "Purchase Error", description: "Required information is missing.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const saleInfo = salesDB.get(selectedAsset.id);
      if (!saleInfo) throw new Error("Sale information for this asset could not be found.");
      
      // Strict validation of required data for the transfer
      if (!saleInfo.compression || !saleInfo.compression.data_hash || !saleInfo.compression.creator_hash || !saleInfo.compression.leaf_id) {
          throw new Error("Local sale info is incomplete. Missing data_hash, creator_hash, or leaf_id.");
      }

      toast({ title: "Preparing Transaction...", description: "Fetching asset proof for the swap." });

      // 1. Get the asset's proof from the RPC
      const assetProof = await getAssetProof(selectedAsset.id);
      if (!assetProof || !assetProof.root || !assetProof.proof || assetProof.proof.length === 0 || !assetProof.tree_id) {
        throw new Error("Failed to fetch a valid asset proof. The asset may not be transferable.");
      }
      
      const sellerPublicKey = new PublicKey(saleInfo.seller);

      // 2. Build the transfer instruction for the cNFT with validated data
      const treeId = new PublicKey(assetProof.tree_id);
      const leafOwner = sellerPublicKey;
      const leafDelegate = sellerPublicKey;
      const newLeafOwner = publicKey; // The buyer
      const merkleTree = treeId;
      const root = new PublicKey(assetProof.root);
      const dataHash = new PublicKey(saleInfo.compression.data_hash);
      const creatorHash = new PublicKey(saleInfo.compression.creator_hash);
      const leafIndex = saleInfo.compression.leaf_id;
      const proofPath = assetProof.proof.map((path: string) => new PublicKey(path));

      const transferInstruction = createTransferInstruction(
        {
          treeId,
          leafOwner,
          leafDelegate,
          newLeafOwner,
          merkleTree,
          root,
          dataHash,
          creatorHash,
          leafIndex,
          anchor: false,
        },
        // The instruction expects an array of PublicKeys, not strings.
        { proof: proofPath }
      );

      // 3. Build the SOL payment instruction
      const paymentInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: sellerPublicKey,
        lamports: saleInfo.price * 1_000_000_000,
      });

      toast({ title: "Finalizing Swap...", description: "Please approve the transaction in your wallet." });

      // 4. Create and send the transaction
      const { blockhash } = await connection.getLatestBlockhash();
      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [paymentInstruction, transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(message);
      const signedTx = await signTransaction(transaction);
      const txid = await connection.sendTransaction(signedTx);

      await connection.confirmTransaction({
        signature: txid,
        blockhash: blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      }, 'confirmed');

      // 5. Update UI on success
      const currentSalesDB = getSalesDB();
      currentSalesDB.delete(selectedAsset.id);
      updateSalesDB(currentSalesDB);
      refreshListings();

      toast({
        title: "Purchase Successful!",
        description: `You have successfully acquired ${selectedAsset.name}.`,
        className: "bg-green-600 text-white border-green-600",
      });

    } catch (error) {
      console.error("Error purchasing asset:", error);
      const errorMessage = error instanceof Error ? error.message : "The transaction could not be completed.";
      toast({ title: "Purchase Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setBuyModalOpen(false);
    }
  };


  const handleConfirmListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!publicKey || !sendTransaction) {
       toast({ title: "Wallet Not Connected", description: "Please connect your wallet.", variant: "destructive" });
       return;
    }
    
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const price = parseFloat(formData.get('price') as string);

    if (!selectedNft) {
        toast({ title: "No Asset Selected", description: "Please select an asset to list.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
     // Strict validation of the selected NFT's compression data before any async calls
    if (!selectedNft.compression || !selectedNft.compression.data_hash || !selectedNft.compression.creator_hash || !selectedNft.compression.leaf_id) {
        toast({ title: "Listing Failed", description: "Selected asset is missing required compression data.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
        toast({ title: "Preparing Listing...", description: "Fetching asset proof for delegation." });

        // 1. Get the asset's proof from the RPC
        const assetProof = await getAssetProof(selectedNft.id);
        if (!assetProof || !assetProof.root || !assetProof.proof || assetProof.proof.length === 0 || !assetProof.tree_id) {
            throw new Error("Failed to fetch a valid asset proof. The asset may not be delegatable.");
        }
        
        // This is a simulated listing. In a real app, this would create
        // an on-chain `delegate` transaction. Here we just get a signature
        // to prove ownership and then list it in our local database.
        toast({ title: "Requesting Signature...", description: "Please approve the transaction to list your asset." });

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: publicKey,
                lamports: 1, // A negligible amount to trigger a signature
            })
        );
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        
        const txId = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(txId, 'confirmed');

        // On-chain action was successful (simulated), now update our local DB
        const currentSalesDB = getSalesDB();
        
        currentSalesDB.set(selectedNft.id, { 
            price, 
            seller: publicKey.toBase58(), 
            compression: selectedNft.compression,
            name: selectedNft.name,
            imageUrl: selectedNft.imageUrl || `https://placehold.co/400x400.png`,
            hint: selectedNft.hint || 'user asset',
        });
        updateSalesDB(currentSalesDB);
        refreshListings();

        toast({
            title: "Listing Successful!",
            description: "Your asset is now live on the marketplace.",
            className: "bg-green-600 text-white border-green-600",
        });

    } catch (error) {
        console.error("Error listing NFT:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not list your asset. Check console for details.";
        toast({ title: "Listing Failed", description: errorMessage, variant: "destructive" });
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
                              onClick={() => setSelectedNft(nft)}
                              className={`cursor-pointer transition-all ${selectedNft?.id === nft.id ? 'ring-2 ring-primary' : ''}`}
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

    