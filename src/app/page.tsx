
"use client";

import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RpcContext } from '@/components/providers/rpc-provider';
import { doc, getDoc, setDoc, arrayUnion, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firestore';
import { Settings, Image as ImageIcon, AlertTriangle, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum';
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-auth-rules';


const ALLOWED_LISTER_ADDRESS = '8iYEMxwd4MzZWjfke72Pqb18jyUcrbL4qLpHNyBYiMZ2';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/400x400.png';
const MAGIC_EDEN_V2_PROGRAM_ID = new PublicKey('M2mx93ekt1u7wiZqVSpcXL6FRmtjJ7atZtw2qvE5k9e');

type UserNFT = {
  id: string;
  name: string;
  imageUrl: string;
  sourceHostname: string;
  hint?: string;
  compression: any;
  listing?: Listing;
};

type Listing = {
  id: string;
  nftId: string;
  price: number;
  seller: string;
};

const sanitizeImageUrl = (url: string | undefined | null): string => {
  if (!url) return PLACEHOLDER_IMAGE_URL;
  try {
    new URL(url);
    return url;
  } catch (error) {
    return PLACEHOLDER_IMAGE_URL;
  }
};

export default function Home() {
  const { toast } = useToast();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { rpcEndpoint } = useContext(RpcContext);
  const db = useFirestore();
  const connection = useMemo(() => {
    if (!rpcEndpoint) return null;
    try {
      return new Connection(rpcEndpoint);
    } catch (e) {
      console.error("Failed to create connection:", e);
      return null;
    }
  }, [rpcEndpoint]);

  const [isLoading, setIsLoading] = useState(true);
  const [userNfts, setUserNfts] = useState<UserNFT[]>([]);
  const [spamHostnames, setSpamHostnames] = useState<string[]>([]);
  const [showSpam, setShowSpam] = useState(false);
  const [showImgSource, setShowImgSource] = useState(false);
  
  const [selectedNft, setSelectedNft] = useState<UserNFT | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [isListing, setIsListing] = useState(false);

  const [selectedSpamCandidate, setSelectedSpamCandidate] = useState<{hostname: string, url: string} | null>(null);

  const isAdmin = useMemo(() => publicKey?.toBase58() === ALLOWED_LISTER_ADDRESS, [publicKey]);

  const fetchSpamList = useCallback(async () => {
    if (!db) return;
    try {
      const configDocRef = doc(db, 'appConfig', 'spamHostnames');
      const docSnap = await getDoc(configDocRef);
      if (docSnap.exists()) {
        setSpamHostnames(docSnap.data().hostnames || []);
      }
    } catch (error) {
      console.error("Error fetching spam list:", error);
    }
  }, [db]);

  const handleAddSpamHostname = async () => {
    if (!db || !isAdmin || !selectedSpamCandidate) return;
    try {
      const configDocRef = doc(db, 'appConfig', 'spamHostnames');
      await setDoc(configDocRef, { hostnames: arrayUnion(selectedSpamCandidate.hostname) }, { merge: true });
      toast({ title: 'Spam List Updated', description: `${selectedSpamCandidate.hostname} added.`, className: 'bg-green-600 text-white border-green-600' });
      await fetchSpamList();
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Could not update spam list.', variant: 'destructive' });
    } finally {
      setSelectedSpamCandidate(null);
    }
  };

  useEffect(() => {
    fetchSpamList();
  }, [fetchSpamList]);

  const getAssetProof = useCallback(async (assetId: string) => {
    if (!rpcEndpoint) throw new Error("RPC endpoint is not set.");
    try {
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
      if (!result?.proof || !result.root || !result.tree_id) {
          throw new Error('Failed to retrieve a valid asset proof. The RPC response is incomplete.');
      }
      return result;
    } catch (error) {
      console.error('Error fetching asset proof:', error);
      throw error;
    }
  }, [rpcEndpoint]);

  const handleConfirmListing = async () => {
    if (!publicKey || !selectedNft || !db || isListing || !connection) return;

    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Invalid Price', description: 'Please enter a valid price.', variant: 'destructive' });
      return;
    }

    setIsListing(true);
    try {
        const assetProof = await getAssetProof(selectedNft.id);

        const { root, proof, tree_id, leaf_id } = assetProof;
        const { data_hash, creator_hash } = selectedNft.compression;

        if (!root || !proof || !tree_id || !leaf_id || !data_hash || !creator_hash) {
            throw new Error("Missing required data for transaction.");
        }

        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const treePublicKey = new PublicKey(tree_id);

        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID);
        const leafIndex = leaf_id;

        const instructionData = Buffer.concat([
          Buffer.from([0x2]), // Magic Eden Sell instruction identifier
          new PublicKey(publicKey).toBuffer(), // seller
          new PublicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboEP4vE').toBuffer(), // some ME authority
          new PublicKey(selectedNft.id).toBuffer(), // account
          Buffer.alloc(8), // price in lamports, placeholder
          Buffer.alloc(8)  // expiry, placeholder
        ]);


        const sellInstruction = new TransactionInstruction({
            programId: MAGIC_EDEN_V2_PROGRAM_ID,
            keys: [
                { pubkey: publicKey, isSigner: true, isWritable: false },
                { pubkey: treePublicKey, isSigner: false, isWritable: false },
                { pubkey: treeConfig, isSigner: false, isWritable: false},
                { pubkey: rootPublicKey, isSigner: false, isWritable: false},
                { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                { pubkey: new PublicKey(leaf_id), isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: instructionData,
        });

        const transaction = new Transaction().add(sellInstruction);
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'processed');

        await setDoc(doc(db, "listings", selectedNft.id), {
            nftId: selectedNft.id,
            seller: publicKey.toBase58(),
            price: price,
            createdAt: serverTimestamp(),
            status: 'listed',
        });

        toast({ title: "Success!", description: "Your NFT has been listed for sale.", className: 'bg-green-600 text-white border-green-600' });
        setSelectedNft(null);
        setListingPrice('');
        fetchUserNfts();

    } catch (error: any) {
        console.error("Listing failed:", error);
        toast({ title: "Listing Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
        setIsListing(false);
    }
  };


  const fetchUserNfts = useCallback(async () => {
    if (!publicKey || !rpcEndpoint) {
      setUserNfts([]);
      setIsLoading(false);
      return;
    };
    setIsLoading(true);
    try {
        const response = await fetch(rpcEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAssetsByOwner',
                params: {
                    ownerAddress: publicKey.toBase58(),
                    sortBy: { sortBy: "created", sortDirection: "asc" },
                    limit: 1000,
                    page: 1,
                    displayOptions: { showUnverifiedCollections: true, showCollectionMetadata: true, showFungible: false, showNativeBalance: false, showInscription: false },
                },
            }),
        });

        const { result } = await response.json();
        if (result && result.items) {
            const listingsSnapshot = db ? await getDocs(query(collection(db, "listings"), where("seller", "==", publicKey.toBase58()))) : null;
            const listingsMap = new Map<string, Listing>();
            listingsSnapshot?.forEach(doc => listingsMap.set(doc.id, { id: doc.id, ...doc.data() } as Listing));

            const fetchedNfts: UserNFT[] = result.items
                .filter((asset: any) => asset.compression && asset.compression.compressed && asset.content?.metadata?.name && asset.content.links?.image)
                .map((asset: any) => {
                  let sourceHostname = 'unknown';
                  try {
                    sourceHostname = new URL(asset.content.links.image).hostname;
                  } catch (e) { /* ignore malformed urls */ }

                  return {
                    id: asset.id,
                    name: asset.content.metadata.name,
                    imageUrl: asset.content.links.image,
                    sourceHostname,
                    hint: 'user asset',
                    compression: asset.compression,
                    listing: listingsMap.get(asset.id),
                  };
                });
            setUserNfts(fetchedNfts);
        } else {
            setUserNfts([]);
        }
    } catch (error) {
        console.error("Error fetching cNFTs:", error);
        toast({ title: "Failed to fetch NFTs", description: "Could not retrieve your cNFTs.", variant: "destructive" });
        setUserNfts([]);
    } finally {
        setIsLoading(false);
    }
  }, [publicKey, rpcEndpoint, toast, db]);

  useEffect(() => {
    if (connected && rpcEndpoint) {
      fetchUserNfts();
    } else {
      setIsLoading(false);
      setUserNfts([]);
    }
  }, [connected, rpcEndpoint, fetchUserNfts]);

  const filteredNfts = useMemo(() => {
    if (showSpam) return userNfts;
    return userNfts.filter(nft => !spamHostnames.includes(nft.sourceHostname));
  }, [userNfts, spamHostnames, showSpam]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <AlertDialog open={selectedSpamCandidate !== null} onOpenChange={(open) => !open && setSelectedSpamCandidate(null)}>
          <Dialog open={selectedNft !== null} onOpenChange={(open) => { if (!open) setSelectedNft(null); }}>
            <section className="container mx-auto px-4 py-8">
              <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  SolSwapper
                  </h1>
                  <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                  The simplest way to swap compressed assets on Solana.
                  </p>
              </div>
              
              {!connected && (
                  <div className="text-center py-16 flex flex-col items-center justify-center gap-4">
                      <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
                      <p className="mt-2 text-muted-foreground">Please connect your wallet to see your assets.</p>
                      <Button onClick={() => setWalletModalVisible(true)}>Connect Wallet</Button>
                  </div>
              )}

              {connected && !rpcEndpoint && (
                  <div className="text-center py-16 flex flex-col items-center justify-center gap-4">
                      <h2 className="text-2xl font-semibold">RPC Endpoint Required</h2>
                      <p className="mt-2 text-muted-foreground">Please configure an RPC endpoint in settings to view your assets.</p>
                      <Link href="/settings"><Button><Settings className="h-5 w-5 mr-2" />Go to Settings</Button></Link>
                  </div>
              )}
              
              {connected && rpcEndpoint && (
                  <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                      <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                              <Checkbox id="show-spam" checked={showSpam} onCheckedChange={(checked) => setShowSpam(Boolean(checked))} />
                              <Label htmlFor="show-spam">Show possible spam</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <Checkbox id="show-source" checked={showImgSource} onCheckedChange={(checked) => setShowImgSource(Boolean(checked))} />
                              <Label htmlFor="show-source">Show img source</Label>
                          </div>
                      </div>
                      <Button onClick={fetchUserNfts} variant="outline" size="sm" disabled={!connection}>Refresh</Button>
                  </div>
              )}

              {connected && rpcEndpoint && isLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
                  </div>
              )}

              {connected && rpcEndpoint && !isLoading && filteredNfts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredNfts.map((nft) => {
                      const isSpam = spamHostnames.includes(nft.sourceHostname);
                      return (
                      <Card key={nft.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1 bg-card">
                          <CardHeader className="p-0 relative">
                          {(showImgSource || (isSpam && showSpam)) && (
                              <div className="absolute top-2 right-2 z-10">
                                {isAdmin && !isSpam ? (
                                    <AlertDialogTrigger asChild>
                                        <Badge variant="secondary" className="cursor-pointer hover:bg-muted" onClick={() => setSelectedSpamCandidate({ hostname: nft.sourceHostname, url: nft.imageUrl })}>
                                            {nft.sourceHostname}
                                        </Badge>
                                    </AlertDialogTrigger>
                                ) : (
                                    <Badge variant={isSpam ? 'destructive' : 'secondary'}>
                                        {isSpam && <AlertTriangle className="h-3 w-3 mr-1" />}{nft.sourceHostname}
                                    </Badge>
                                )}
                              </div>
                          )}
                          <div className="aspect-square relative w-full">
                              <Image src={sanitizeImageUrl(nft.imageUrl)} alt={nft.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" data-ai-hint={nft.hint ?? 'asset'} />
                          </div>
                          </CardHeader>
                          <CardContent className="p-4 flex-grow flex flex-col">
                            <CardTitle className="text-lg font-semibold flex-grow">{nft.name}</CardTitle>
                             {nft.listing && (
                                <Badge variant="secondary" className="mt-2 self-start">
                                    Listed for {nft.listing.price} SOL
                                </Badge>
                             )}
                          </CardContent>
                          <CardFooter className="p-2 border-t mt-auto">
                              {nft.listing ? (
                                  <Button variant="destructive" className="w-full" disabled>
                                      <X className="mr-2 h-4 w-4" />
                                      Cancel Listing
                                  </Button>
                              ) : (
                                <DialogTrigger asChild>
                                  <Button variant="outline" className="w-full" onClick={() => setSelectedNft(nft)}>
                                      <Tag className="mr-2 h-4 w-4" />
                                      List your Asset
                                  </Button>
                                </DialogTrigger>
                              )}
                          </CardFooter>
                      </Card>
                      )
                  })}
                  </div>
              ) : (
                  connected && rpcEndpoint && !isLoading && (
                  <div className="text-center py-16 flex flex-col items-center justify-center gap-4">
                      <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      <h2 className="text-2xl font-semibold">No cNFTs Found</h2>
                      <p className="mt-2 text-muted-foreground">We couldn't find any compressed NFTs in your wallet.</p>
                      <Button onClick={fetchUserNfts} variant="outline" disabled={!connection}>Refresh</Button>
                  </div>
                  )
              )}
            </section>
        
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Add to Spam List?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to blacklist <strong className="text-destructive">{selectedSpamCandidate?.hostname}</strong>? This will hide assets from this source.
                        <br/><br/>
                        <span className="text-xs text-muted-foreground break-all">Source URL: {selectedSpamCandidate?.url}</span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedSpamCandidate(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAddSpamHostname}>Yes, Blacklist</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>List Your Asset for Sale</DialogTitle>
                    <DialogDescription>
                        Set a price in SOL for your cNFT. Once listed, another user can purchase it through the marketplace.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Price (SOL)</Label>
                        <Input
                            id="price"
                            type="number"
                            value={listingPrice}
                            onChange={(e) => setListingPrice(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 0.5"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedNft(null)}>Cancel</Button>
                    <Button onClick={handleConfirmListing} disabled={isListing || !connection}>
                        {isListing ? 'Listing...' : 'Confirm Listing'}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </AlertDialog>
      </main>
    </div>
  );
}
