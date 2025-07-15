
"use client";

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CodeViewer({ code }: { code: string }) {
    const [hasCopied, setHasCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setHasCopied(true);
        setTimeout(() => {
            setHasCopied(false);
        }, 2000);
    };

    return (
        <div className="relative h-full flex-grow flex flex-col">
            <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 z-10 h-8 w-8"
                onClick={copyToClipboard}
            >
                {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy code</span>
            </Button>
            <ScrollArea className="h-full w-full rounded-md border bg-card flex-grow">
                 <SyntaxHighlighter
                    language="tsx"
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: 'transparent',
                        height: '100%',
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: "var(--font-code)",
                        },
                    }}
                    showLineNumbers
                 >
                    {code}
                </SyntaxHighlighter>
            </ScrollArea>
        </div>
    );
}

const firebaseConfigContent = `
import type { FirebaseOptions } from "firebase/app";

export const firebaseConfig: FirebaseOptions = {
  apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  projectId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  storageBucket: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  messagingSenderId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  appId: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
};
`.trim();

const pageTsxContent = `
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
import { doc, getDoc, setDoc, arrayUnion, collection, query, where, getDocs, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
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
import { Connection, TransactionInstruction, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';


const ALLOWED_LISTER_ADDRESS = '8iYEMxwd4MzZWjfke72Pqb18jyUcrbL4qLpHNyBYiMZ2';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/400x400.png';

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
  status: 'listed' | 'pending' | 'sold' | 'cancelled' | 'failed';
  txSignature?: string;
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
  const functions = useMemo(() => db ? getFunctions(db.app) : null, [db]);

  const connection = useMemo(() => {
    if (!rpcEndpoint) return null;
    try {
      return new Connection(rpcEndpoint, 'confirmed');
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
  const [isCancelling, setIsCancelling] = useState(false);

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
      toast({ title: 'Spam List Updated', description: \`\${selectedSpamCandidate.hostname} added.\`, className: 'bg-green-600 text-white border-green-600' });
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

  const handleConfirmListing = async () => {
    if (!publicKey || !selectedNft || !db || isListing || !rpcEndpoint || !functions || !connection) {
        toast({ title: 'Prerequisites Missing', description: 'Wallet not connected or services unavailable.', variant: 'destructive' });
        return;
    }

    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
        toast({ title: 'Invalid Price', description: 'Please enter a valid price.', variant: 'destructive' });
        return;
    }

    setIsListing(true);
    const listingId = selectedNft.id;

    try {
        if (!selectedNft.compression) {
            throw new Error("Selected NFT is missing required compression data.");
        }

        await setDoc(doc(db, "listings", listingId), {
            nftId: listingId,
            seller: publicKey.toBase58(),
            price: price,
            status: 'pending',
            createdAt: serverTimestamp(),
            compression: selectedNft.compression,
        });

        const createListingTransaction = httpsCallable(functions, 'createListingTransaction');
        const { data } = await createListingTransaction({
            nftId: listingId,
            seller: publicKey.toBase58(),
            price,
            rpcEndpoint,
            compression: selectedNft.compression,
        }) as any;

        if (!data.success || !data.instruction) {
            throw new Error(data.message || 'Failed to create instruction on the backend.');
        }

        const sellInstruction = new TransactionInstruction({
            programId: new PublicKey(data.instruction.programId),
            keys: data.instruction.keys.map((k: any) => ({
                pubkey: new PublicKey(k.pubkey),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(data.instruction.data, "base64"),
        });

        const latestBlockhash = await connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [sellInstruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(message);
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');

        await updateDoc(doc(db, "listings", listingId), {
            status: 'listed',
            txSignature: signature,
        });

        toast({
            title: "Asset Listed!",
            description: "Your asset is now live in the marketplace.",
            className: 'bg-green-600 text-white border-green-600'
        });

        fetchUserNfts();

    } catch (error: any) {
        console.error("Listing failed:", error);
        toast({ title: "Listing Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });

        await deleteDoc(doc(db, "listings", listingId));
        fetchUserNfts();
    } finally {
        setIsListing(false);
        setSelectedNft(null);
        setListingPrice('');
    }
  };

  const handleCancelListing = async (nft: UserNFT) => {
    if (!publicKey || !nft.listing || !db || isCancelling || !rpcEndpoint || !functions || !connection) {
      toast({ title: 'Prerequisites Missing', description: 'Cannot cancel listing at this time.', variant: 'destructive' });
      return;
    }
    
    setIsCancelling(true);
    const listingId = nft.id;

    try {
        const createCancelListingTransaction = httpsCallable(functions, 'createCancelListingTransaction');
        const { data } = await createCancelListingTransaction({
            nftId: listingId,
            seller: publicKey.toBase58(),
            rpcEndpoint,
            compression: nft.compression,
        }) as any;

        if (!data.success || !data.instruction) {
            throw new Error(data.message || 'Failed to create cancel instruction on the backend.');
        }
        
        const cancelInstruction = new TransactionInstruction({
            programId: new PublicKey(data.instruction.programId),
            keys: data.instruction.keys.map((k: any) => ({
                pubkey: new PublicKey(k.pubkey),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(data.instruction.data, "base64"),
        });

        const latestBlockhash = await connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [cancelInstruction],
        }).compileToV0Message();
        
        const transaction = new VersionedTransaction(message);
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');

        await deleteDoc(doc(db, "listings", listingId));
        
        toast({
            title: "Listing Cancelled",
            description: "Your asset has been removed from the marketplace.",
            className: 'bg-green-600 text-white border-green-600'
        });
        
        fetchUserNfts();

    } catch (error: any) {
        console.error("Cancellation failed:", error);
        toast({ title: "Cancellation Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally {
        setIsCancelling(false);
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
            listingsSnapshot?.forEach(doc => {
              const data = doc.data() as Listing;
              // Only consider 'listed' items as active. Ignore pending/failed from previous sessions.
              if (data.status === 'listed') {
                listingsMap.set(doc.id, { id: doc.id, ...data });
              }
            });

            const fetchedNfts: UserNFT[] = result.items
                .filter((asset: any) => asset.compression?.compressed && asset.content?.metadata?.name && asset.content.links?.image)
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
                  <div className="text-center py-16">
                      <p className="text-muted-foreground">Please connect your wallet to view your assets.</p>
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
                                <Badge variant={nft.listing.status === 'listed' ? 'secondary' : 'default'} className="mt-2 self-start">
                                    {nft.listing.status === 'listed' ? \`Listed for \${nft.listing.price} SOL\` : \`Listing...\`}
                                </Badge>
                             )}
                          </CardContent>
                          <CardFooter className="p-2 border-t mt-auto">
                              {nft.listing?.status === 'listed' ? (
                                  <Button variant="destructive" className="w-full" onClick={() => handleCancelListing(nft)} disabled={isCancelling}>
                                      {isCancelling ? 'Cancelling...' : (
                                        <>
                                          <X className="mr-2 h-4 w-4" />
                                          Cancel Listing
                                        </>
                                      )}
                                  </Button>
                              ) : (
                                <DialogTrigger asChild>
                                  <Button variant="outline" className="w-full" onClick={() => setSelectedNft(nft)} disabled={!!nft.listing}>
                                      <Tag className="mr-2 h-4 w-4" />
                                      List Asset
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
                    <Button onClick={handleConfirmListing} disabled={isListing}>
                        {isListing ? 'Processing...' : 'Confirm Listing'}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </AlertDialog>
      </main>
    </div>
  );
}
`.trim();

const functionsIndexContent = `
/**
 * @fileOverview Firebase Cloud Functions for the SolSwapper application.
 *
 * This file contains the server-side logic for handling Solana transactions,
 * such as creating listing and delisting instructions for a marketplace.
 * The primary principle is to perform all sensitive operations and on-chain
 * data fetching on the server to ensure security and reliability.
 */

import { initializeApp } from "firebase-admin/app";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
    PublicKey,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";

// Initialize Firebase Admin SDK. This is required for all backend Firebase services.
initializeApp();

// Define the structure of data we expect from the client for a listing.
interface ListingData {
    nftId: string;
    seller: string;
    price: number;
    rpcEndpoint: string;
    compression: any; // Contains tree, data_hash, creator_hash etc.
}

// Define the structure for cancelling a listing.
interface CancelData {
    nftId: string;
    seller: string;
    rpcEndpoint: string;
    compression: any;
}

// This is a placeholder for a real marketplace program ID.
// For a real app, this would be the public key of the deployed marketplace contract.
// Example uses TensorSwap's Program ID.
const TENSOR_SWAP_PROGRAM_ID = new PublicKey('TSWAPamCemEuHa2vG5aE7wT6eJk2rleVvVSbSKv1p5p');


/**
 * Fetches the asset's cryptographic proof and its leaf index from the Merkle tree.
 * This is a critical server-side step to verify ownership and location of a
 * compressed NFT before creating any transaction.
 * @param rpcEndpoint The Solana RPC endpoint URL to use for the request.
 * @param assetId The ID of the compressed NFT to fetch the proof for.
 * @returns An object containing the asset proof, the tree's root hash, and the leaf index.
 * @throws HttpsError if the proof cannot be fetched or is invalid.
 */
const getAssetProofAndIndex = async (rpcEndpoint: string, assetId: string) => {
    try {
        const getAsset = await fetch(rpcEndpoint, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 jsonrpc: '2.0',
                 id: 'my-id',
                 method: 'getAsset',
                 params: { id: assetId },
             }),
         });
        const { result: asset } = await getAsset.json();
        
        const getAssetProof = await fetch(rpcEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAssetProof',
                params: { id: assetId },
            }),
        });
        const { result: proof } = await getAssetProof.json();

        // Validate the response from the RPC. If it's missing key fields, we can't proceed.
        if (!proof?.proof || !proof.root || asset.compression.leaf_id === undefined) {
             throw new Error('Failed to retrieve a valid asset proof. The RPC response is incomplete.');
        }

        return {
            proof: proof.proof,
            root: proof.root,
            leafIndex: asset.compression.leaf_id
        };
    } catch (error) {
        logger.error("Error fetching asset proof:", error);
        // Throw a specific HttpsError that the client can handle.
        throw new HttpsError("internal", "Could not fetch asset proof from RPC.", { originalError: error instanceof Error ? error.message : "Unknown error" });
    }
};


/**
 * A callable Cloud Function to create a secure listing instruction on the backend.
 * This function is called directly from the Next.js app.
 */
export const createListingTransaction = onCall<ListingData>({ cors: true }, async (request) => {
    // Step 1: Authentication & Validation
    // ===================================
    // Ensure the user is authenticated with Firebase Auth.
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to list an item.");
    }
    // Extract data from the client request.
    const { nftId, seller, price, rpcEndpoint, compression } = request.data;

    // Verify that the authenticated user is the one trying to list the asset.
    if (request.auth.token.sub !== seller) {
        throw new HttpsError("permission-denied", "You can only list your own assets.");
    }
    // Basic validation to ensure we have all the required data.
    if (!nftId || !price || price <= 0 || !rpcEndpoint || !compression?.tree) {
        throw new HttpsError("invalid-argument", "Missing required data for listing.");
    }

    logger.info(\`Processing listing for NFT: \${nftId} by seller: \${seller} for \${price} SOL.\`);

    try {
        // Step 2: Fetch Required On-Chain Data (Securely on the Server)
        // ==============================================================
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);
        logger.info(\`Successfully fetched proof for NFT \${nftId}. Leaf index: \${leafIndex}\`);


        // Step 3: Define Keys and Build the Transaction Instruction
        // ========================================================
        const { data_hash, creator_hash } = compression;
        if (!data_hash || !creator_hash) {
            throw new HttpsError("invalid-argument", "Compression data is incomplete.");
        }

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);

        // This is a program-derived address (PDA) required by the Bubblegum program.
        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID);

        // This is a placeholder for a real marketplace instruction.
        // The actual accounts and data would come from the marketplace's SDK documentation.
        const sellInstruction = new TransactionInstruction({
            programId: TENSOR_SWAP_PROGRAM_ID,
            keys: [
                { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                // ... other accounts required by the marketplace program like whitelist, mint, token accounts etc.
                { pubkey: treeConfig, isSigner: false, isWritable: false },
                { pubkey: rootPublicKey, isSigner: false, isWritable: false },
                { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                // The proof is passed as a series of "remaining accounts".
                ...proof.map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
                // System programs that are often required.
                { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            // The instruction data buffer would be specific to the marketplace's \`sell\` instruction
            // and would be serialized to include price, leaf index, etc.
            data: Buffer.from(new Uint8Array([
                ...new PublicKey("TSWAPSSLiG66wP34J2pS2i6zoR2i4Y2GZLBZ5Q42M26").toBuffer(), // Tswap discriminator
                1, // List
                ...new BN(leafIndex).toArray("le", 8),
                ...new BN(price * LAMPORTS_PER_SOL).toArray("le", 8)
            ])),
        });


        // Step 4: Serialize and Return the Instruction to the Client
        // ==========================================================
        const serializedInstruction = {
            programId: sellInstruction.programId.toBase58(),
            keys: sellInstruction.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(sellInstruction.data).toString("base64"),
        };

        logger.info(\`Instruction for \${nftId} is ready for client-side transaction assembly.\`);

        // Send the serialized instruction back to the client.
        return {
            success: true,
            message: "Instruction ready for signing.",
            instruction: serializedInstruction,
        };

    } catch (error: any) {
        logger.error("Error creating listing instruction:", error);
        // If any part of the process fails, throw an error the client can understand.
        throw new HttpsError("internal", "Could not create the listing instruction.", { message: error.message });
    }
});


/**
 * A callable Cloud Function to create a secure delisting instruction.
 * This follows the same pattern as the listing function.
 */
export const createCancelListingTransaction = onCall<CancelData>({ cors: true }, async (request) => {
    // Step 1: Authentication & Validation
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to manage listings.");
    }
    const { nftId, seller, rpcEndpoint, compression } = request.data;
    if (request.auth.token.sub !== seller) {
        throw new HttpsError("permission-denied", "You can only cancel your own listings.");
    }
    if (!nftId || !rpcEndpoint || !compression?.tree) {
        throw new HttpsError("invalid-argument", "Missing required data for cancellation.");
    }

    logger.info(\`Processing cancel instruction for NFT: \${nftId} by seller: \${seller}.\`);

    try {
        // Step 2: Fetch On-Chain Data
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);

        // Step 3: Build Instruction
        const { data_hash, creator_hash } = compression;
        if (!data_hash || !creator_hash) {
            throw new HttpsError("invalid-argument", "Compression data is incomplete.");
        }

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);
        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID);

        // This is a placeholder for a real marketplace \`cancel_sell\` instruction.
        const cancelInstruction = new TransactionInstruction({
            programId: TENSOR_SWAP_PROGRAM_ID,
            keys: [
                 { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                // ... other accounts required by the marketplace program
                { pubkey: treeConfig, isSigner: false, isWritable: false },
                { pubkey: rootPublicKey, isSigner: false, isWritable: false },
                { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                 ...proof.map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
                { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: Buffer.from(new Uint8Array([
                ...new PublicKey("TSWAPSSLiG66wP34J2pS2i6zoR2i4Y2GZLBZ5Q42M26").toBuffer(), // Tswap discriminator
                2, // Delist
                ...new BN(leafIndex).toArray("le", 8)
            ])),
        });

        // Step 4: Serialize and Return
        const serializedInstruction = {
            programId: cancelInstruction.programId.toBase58(),
            keys: cancelInstruction.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(cancelInstruction.data).toString("base64"),
        };

        logger.info(\`Cancel instruction for \${nftId} is ready for client-side transaction assembly.\`);

        return {
            success: true,
            message: "Cancel instruction ready for signing.",
            instruction: serializedInstruction,
        };

    } catch (error: any) {
        logger.error("Error creating cancel instruction:", error);
        throw new HttpsError("internal", "Could not create the cancel instruction.", { message: error.message });
    }
});
`.trim();

const settingsPageContent = `
"use client";

import { useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RpcContext } from '@/components/providers/rpc-provider';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { connected } = useWallet();
  const {
    rpcEndpoint,
    setRpcEndpoint,
    savedRpcEndpoints,
    addRpcEndpoint
  } = useContext(RpcContext);
  const { toast } = useToast();

  const [selectedRpc, setSelectedRpc] = useState<string>(rpcEndpoint);
  const [newRpcInput, setNewRpcInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedRpc(rpcEndpoint);
  }, [rpcEndpoint]);

  const handleLoadRpc = () => {
    if (!selectedRpc) {
      toast({ title: 'No RPC Selected', description: 'Please select an RPC from the list.', variant: 'destructive' });
      return;
    }
    setRpcEndpoint(selectedRpc);
    toast({
      title: 'RPC Endpoint Loaded',
      description: \`The RPC endpoint has been set for this session.\`,
      className: 'bg-green-600 text-white border-green-600',
    });
  };
  
  const handleSaveNewRpc = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newRpcInput) {
      toast({ title: 'Invalid RPC URL', description: 'RPC endpoint cannot be empty.', variant: 'destructive' });
      return;
    }

    try {
      new URL(newRpcInput); // Basic URL validation
    } catch (error) {
      toast({ title: 'Invalid RPC URL', description: 'Please enter a valid URL.', variant: 'destructive' });
      return;
    }

    if (savedRpcEndpoints.includes(newRpcInput)) {
        toast({ title: 'Duplicate RPC', description: 'This RPC endpoint is already saved.', variant: 'destructive' });
        return;
    }

    setIsSaving(true);
    try {
      await addRpcEndpoint(newRpcInput);
      toast({
        title: 'RPC Saved Successfully',
        description: 'The new RPC has been added to your saved list and set as active.',
        className: 'bg-green-600 text-white border-green-600',
      });
      setNewRpcInput('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        title: 'Failed to Save RPC',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
    <Header />
    <main className="flex-1">
        <section className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Settings
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Configure your network and application settings.
            </p>
        </div>
        
        <div className="max-w-2xl mx-auto grid gap-8">
            {connected && savedRpcEndpoints.length > 0 && (
            <Card>
                <CardHeader>
                <CardTitle>Load RPC Endpoint</CardTitle>
                <CardDescription>
                    Select a saved RPC endpoint to use for your current session. Your active endpoint is: <strong className="text-primary break-all">{rpcEndpoint || 'Not set'}</strong>
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex flex-col sm:flex-row items-end gap-2">
                    <div className="w-full">
                        <Label htmlFor="rpc-select" className="mb-2 block">Saved RPCs</Label>
                        <Select value={selectedRpc} onValueChange={setSelectedRpc}>
                        <SelectTrigger id="rpc-select" className="w-full">
                            <SelectValue placeholder="Select a saved RPC" />
                        </SelectTrigger>
                        <SelectContent>
                            {savedRpcEndpoints.map(endpoint => (
                            <SelectItem key={endpoint} value={endpoint}>
                                {endpoint}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </div>
                </CardContent>
                <CardFooter>
                <Button onClick={handleLoadRpc} className="w-full sm:w-auto">Load Selected RPC</Button>
                </CardFooter>
            </Card>
            )}

            <Card>
            <CardHeader>
                <CardTitle>{savedRpcEndpoints.length > 0 ? 'Add New RPC Endpoint' : 'Add Your First RPC Endpoint'}</CardTitle>
                <CardDescription>
                {savedRpcEndpoints.length > 0 
                    ? 'Add another custom RPC endpoint to your saved list. It will be linked to your wallet for future sessions.' 
                    : 'You must add a custom RPC endpoint to use the application. It will be saved and linked to your wallet.'}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveNewRpc} className={!connected ? 'opacity-50 pointer-events-none' : ''}>
                <CardContent>
                <div className="w-full">
                    <Label htmlFor="new-rpc" className="mb-2 block">New RPC URL</Label>
                    <Input
                    id="new-rpc"
                    name="new-rpc"
                    value={newRpcInput}
                    onChange={(e) => setNewRpcInput(e.target.value)}
                    className="flex-grow"
                    placeholder="https://your.custom.rpc.com"
                    disabled={!connected}
                    />
                    {!connected && (
                        <p className="text-sm text-muted-foreground mt-2">Please connect your wallet to add an RPC endpoint.</p>
                    )}
                </div>
                </CardContent>
                <CardFooter>
                <Button type="submit" disabled={isSaving || !connected} className="w-full sm:w-auto flex-shrink-0">
                    {isSaving ? 'Saving...' : 'Add & Save New RPC'}
                </Button>
                </CardFooter>
            </form>
            </Card>
        </div>

        </section>
    </main>
    </div>
  );
}
`.trim();

const layoutTsxContent = `
import type { Metadata } from 'next';
import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: 'cNFT Gallery',
  description: 'A viewer for compressed digital assets on Solana',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
`.trim();

const headerTsxContent = `
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
`.trim();

const packageJsonContent = `{
  "name": "nextn",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
    "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@genkit-ai/googleai": "^1.13.0",
    "@genkit-ai/next": "^1.13.0",
    "@hookform/resolvers": "^4.1.3",
    "@metaplex-foundation/mpl-bubblegum": "^1.0.1",
    "@metaplex-foundation/mpl-token-auth-rules": "2.0.0",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-menubar": "^1.1.6",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-phantom": "^0.9.24",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-solflare": "^0.6.28",
    "@solana/web3.js": "^1.96.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "dotenv": "^16.5.0",
    "embla-carousel-react": "^8.6.0",
    "firebase": "^11.9.1",
    "genkit": "^1.13.0",
    "lucide-react": "^0.475.0",
    "next": "15.3.3",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "react-syntax-highlighter": "^15.5.0",
    "recharts": "^2.15.1",
    "tailwind-merge": "^3.0.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/react-syntax-highlighter": "^15.5.13",
    "genkit-cli": "^1.13.0",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}`.trim();


export const projectFiles = [
    { name: 'package.json', type: 'file', content: packageJsonContent },
    {
        name: 'src', type: 'folder', children: [
            {
                name: 'app', type: 'folder', children: [
                    { name: 'page.tsx', type: 'file', content: pageTsxContent },
                    { name: 'layout.tsx', type: 'file', content: layoutTsxContent },
                    { name: 'settings/page.tsx', type: 'file', content: settingsPageContent },
                ]
            },
            {
                name: 'components', type: 'folder', children: [
                     { name: 'layout/header.tsx', type: 'file', content: headerTsxContent },
                ]
            },
            {
                name: 'lib', type: 'folder', children: [
                    { name: 'firebase.ts', type: 'file', content: firebaseConfigContent },
                ]
            },
            {
                name: 'functions', type: 'folder', children: [
                     { name: 'src/index.ts', type: 'file', content: functionsIndexContent },
                ]
            },
        ]
    },
];

    