
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
import { SystemProgram, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { createTransferInstruction, createDelegateInstruction, createRevokeInstruction } from '@metaplex-foundation/mpl-bubblegum';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RpcContext } from '@/components/providers/rpc-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, setDoc, getDoc } from 'firebase/firestore';


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
  
  const [listedAssets, setListedAssets] = useState<Asset[]>([]);

  const [isListModalOpen, setListModalOpen] = useState(false);
  const [isBuyModalOpen, setBuyModalOpen] = useState(false);
  const [isRpcModalOpen, setRpcModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNfts, setIsFetchingNfts] = useState(false);
  const [isNftAlreadyListed, setIsNftAlreadyListed] = useState(false);
  const [userNfts, setUserNfts] = useState<UserNFT[]>([]);
  const [selectedNft, setSelectedNft] = useState<UserNFT | null>(null);
  

  const refreshListings = async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized. Please check your Firebase configuration.");
      }
      const salesCollection = collection(db, 'sales');
      const salesSnapshot = await getDocs(salesCollection);
      const assetsForSale: Asset[] = salesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          price: data.price,
          name: data.name || `Asset ${doc.id.slice(0, 6)}`,
          imageUrl: data.imageUrl || `https://placehold.co/400x400.png`,
          hint: data.hint || 'asset',
        };
      });
      setListedAssets(assetsForSale);
    } catch (error) {
      console.error("Error fetching listings from Firestore:", error);
      toast({
        title: "Failed to load listings",
        description: "Could not connect to the database. Please check your connection and Firebase setup.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshListings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectNft = async (nft: UserNFT) => {
    setSelectedNft(nft);
    setIsNftAlreadyListed(false); // Reset
    try {
        if (!db) return;
        const saleDocRef = doc(db, 'sales', nft.id);
        const docSnap = await getDoc(saleDocRef);
        if (docSnap.exists()) {
            setIsNftAlreadyListed(true);
        }
    } catch (error) {
        console.error("Error checking if NFT is listed:", error);
    }
  };


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
      const saleDocRef = doc(db, 'sales', selectedAsset.id);
      const saleDocSnapshot = await getDoc(saleDocRef);

      if (!saleDocSnapshot.exists()) {
        throw new Error("This asset is no longer for sale.");
      }
      const saleInfo = saleDocSnapshot.data() as SaleInfo;

      if (!saleInfo || !saleInfo.seller || !saleInfo.compression || !saleInfo.compression.data_hash || !saleInfo.compression.creator_hash || typeof saleInfo.compression.leaf_id !== 'number') {
          throw new Error("Sale info from database is incomplete. Cannot proceed with purchase.");
      }
      
      toast({ title: "Preparing Transaction...", description: "Fetching latest asset proof for the swap." });

      const assetProof = await getAssetProof(selectedAsset.id);
      if (!assetProof || !assetProof.root || !assetProof.proof || assetProof.proof.length === 0 || !assetProof.tree_id) {
        throw new Error("Failed to fetch a valid asset proof. The asset may not be transferable.");
      }
      
      const sellerPublicKey = new PublicKey(saleInfo.seller);

      const treeId = new PublicKey(assetProof.tree_id);
      const leafOwner = sellerPublicKey;
      const leafDelegate = sellerPublicKey;
      const newLeafOwner = publicKey;
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
        },
        { proof: proofPath },
        new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY')
      );

      const paymentInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: sellerPublicKey,
        lamports: saleInfo.price * 1_000_000_000,
      });

      toast({ title: "Finalizing Swap...", description: "Please approve the transaction in your wallet." });

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

      await deleteDoc(saleDocRef);
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
    if (!publicKey || !sendTransaction || !selectedNft) {
       toast({ title: "Required info missing", description: "Please connect wallet and select an asset.", variant: "destructive" });
       return;
    }

    if (!selectedNft.compression || !selectedNft.compression.data_hash || !selectedNft.compression.creator_hash || typeof selectedNft.compression.leaf_id !== 'number') {
        toast({ title: "Listing Failed", description: "Selected asset is missing required compression data.", variant: "destructive" });
        return;
    }
    
    const formData = new FormData(event.currentTarget);
    const price = parseFloat(formData.get('price') as string);
    
    setIsLoading(true);

    try {
        const saleDocRef = doc(db, 'sales', selectedNft.id);
        const docSnap = await getDoc(saleDocRef);

        if (docSnap.exists()) {
            toast({
                title: "Already Listed",
                description: "This asset is already for sale. You can cancel the listing if you wish to change it.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        toast({ title: "Preparing Delegation...", description: "Fetching asset proof." });
        
        const assetProof = await getAssetProof(selectedNft.id);

        if (!assetProof || !assetProof.root || !assetProof.proof || !Array.isArray(assetProof.proof) || assetProof.proof.length === 0 || !assetProof.tree_id) {
            throw new Error("Failed to fetch a valid asset proof. The asset may not be delegatable, or may already be delegated.");
        }

        const root = new PublicKey(assetProof.root);
        const dataHash = new PublicKey(selectedNft.compression.data_hash);
        const creatorHash = new PublicKey(selectedNft.compression.creator_hash);
        const nonce = new PublicKey(assetProof.tree_id); // Tree ID is the nonce
        const leafIndex = selectedNft.compression.leaf_id;
        const proofPath = assetProof.proof.map((path: string) => new PublicKey(path));

        const delegateInstruction = createDelegateInstruction({
            leafOwner: publicKey,
            previousLeafDelegate: publicKey,
            newLeafDelegate: MARKETPLACE_AUTHORITY,
            merkleTree: nonce,
            root: root,
            dataHash: dataHash,
            creatorHash: creatorHash,
            leafIndex: leafIndex,
            proof: proofPath,
        });
        
        const { blockhash } = await connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: publicKey,
            recentBlockhash: blockhash,
            instructions: [delegateInstruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(message);

        toast({ title: "Requesting Signature...", description: "Please approve the delegation in your wallet." });
        
        const signedTx = await sendTransaction(transaction, connection);
        await connection.confirmTransaction({
          signature: signedTx,
          blockhash,
          lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
        }, 'confirmed');

        const saleData: SaleInfo = { 
            price, 
            seller: publicKey.toBase58(), 
            compression: selectedNft.compression,
            name: selectedNft.name,
            imageUrl: selectedNft.imageUrl || `https://placehold.co/400x400.png`,
            hint: selectedNft.hint || 'user asset',
        };
        
        await setDoc(saleDocRef, saleData);


        refreshListings();

        toast({
            title: "Listing Successful!",
            description: "Your asset is now delegated and live on the marketplace.",
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
        setIsNftAlreadyListed(false);
    }
  };

  const handleCancelListing = async () => {
    if (!publicKey || !sendTransaction || !selectedNft) {
       toast({ title: "Required info missing", description: "Please connect wallet and select an asset.", variant: "destructive" });
       return;
    }
     setIsLoading(true);
    try {
        toast({ title: "Preparing Revoke...", description: "Fetching asset proof to cancel delegation." });
        
        const assetProof = await getAssetProof(selectedNft.id);

        if (!assetProof || !assetProof.root || !assetProof.proof || !Array.isArray(assetProof.proof) || assetProof.proof.length === 0 || !assetProof.tree_id) {
            throw new Error("Failed to fetch a valid asset proof. The asset may not have a valid delegation to revoke.");
        }

        const root = new PublicKey(assetProof.root);
        const dataHash = new PublicKey(selectedNft.compression.data_hash);
        const creatorHash = new PublicKey(selectedNft.compression.creator_hash);
        const nonce = new PublicKey(assetProof.tree_id);
        const leafIndex = selectedNft.compression.leaf_id;
        const proofPath = assetProof.proof.map((path: string) => new PublicKey(path));

        const revokeInstruction = createRevokeInstruction({
            leafOwner: publicKey,
            leafDelegate: MARKETPLACE_AUTHORITY,
            merkleTree: nonce,
            root: root,
            dataHash: dataHash,
            creatorHash: creatorHash,
            leafIndex: leafIndex,
            proof: proofPath,
        });

        const { blockhash } = await connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: publicKey,
            recentBlockhash: blockhash,
            instructions: [revokeInstruction],
        }).compileToV0Message();
        
        const transaction = new VersionedTransaction(message);

        toast({ title: "Requesting Signature...", description: "Please approve the cancellation in your wallet." });

        const signedTx = await sendTransaction(transaction, connection);
        await connection.confirmTransaction({
          signature: signedTx,
          blockhash,
          lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
        }, 'confirmed');

        const saleDocRef = doc(db, "sales", selectedNft.id);
        await deleteDoc(saleDocRef);

        refreshListings();

        toast({
            title: "Cancellation Successful!",
            description: "Your asset has been delisted from the marketplace.",
            className: "bg-green-600 text-white border-green-600",
        });

    } catch(error) {
        console.error("Error cancelling listing:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not cancel your listing. Check console for details.";
        toast({ title: "Cancellation Failed", description: errorMessage, variant: "destructive" });
    } finally {
        setIsLoading(false);
        setListModalOpen(false);
        setSelectedNft(null);
        setIsNftAlreadyListed(false);
    }
  }


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

          {isLoading && (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
            </div>
          )}

          {!isLoading && listedAssets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listedAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} onBuyClick={handleBuyClick} />
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">No assets for sale</h2>
                <p className="mt-2 text-muted-foreground">Check back later or list one of your own assets!</p>
              </div>
            )
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
      
      <Dialog open={isListModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedNft(null);
          setIsNftAlreadyListed(false);
        }
        setListModalOpen(isOpen);
      }}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>List your Asset</DialogTitle>
                  <DialogDescription>
                      Select one of your cNFTs to list it on the marketplace.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
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
                              onClick={() => handleSelectNft(nft)}
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

                  {selectedNft && isNftAlreadyListed ? (
                     <div className="text-center p-4 bg-muted rounded-md">
                        <p className="font-semibold">This asset is already listed.</p>
                        <p className="text-sm text-muted-foreground">You can cancel the listing to remove it from the marketplace.</p>
                     </div>
                  ) : selectedNft ? (
                    <form onSubmit={handleConfirmListing} className="grid gap-6" id="list-form">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="price" className="text-right">Price (SOL)</Label>
                          <Input id="price" name="price" type="number" step="0.01" required className="col-span-3" placeholder="e.g., 1.5"/>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      Please select an asset from your wallet to continue.
                    </div>
                  )}
                  
                  <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => { setListModalOpen(false); }} disabled={isLoading}>Close</Button>
                      {selectedNft && isNftAlreadyListed ? (
                          <Button variant="destructive" onClick={handleCancelListing} disabled={isLoading || isFetchingNfts}>
                            {isLoading ? "Cancelling..." : "Cancel Listing"}
                          </Button>
                      ) : (
                          <Button type="submit" form="list-form" disabled={isLoading || isFetchingNfts || !selectedNft}>
                              {isLoading ? "Listing..." : "List Asset"}
                          </Button>
                      )}
                  </DialogFooter>
              </div>
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
