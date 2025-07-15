
"use client";

import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RpcContext } from '@/components/providers/rpc-provider';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firestore';
import { Settings, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


const ALLOWED_LISTER_ADDRESS = '8iYEMxwd4MzZWjfke72Pqb18jyUcrbL4qLpHNyBYiMZ2';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/400x400.png';
const TRUSTED_IMAGE_HOSTNAMES = [
  'placehold.co',
  'arweave.net',
  'cdnb.artstation.com',
  'madlads.s3.us-west-2.amazonaws.com'
];

type UserNFT = {
  id: string;
  name: string;
  imageUrl: string;
  sourceHostname: string;
  hint?: string;
  compression: any;
};

const sanitizeImageUrl = (url: string | undefined | null): string => {
  if (!url) return PLACEHOLDER_IMAGE_URL;
  try {
    const urlObject = new URL(url);
    if (urlObject.hostname.endsWith('.arweave.net') || TRUSTED_IMAGE_HOSTNAMES.includes(urlObject.hostname)) {
      return url;
    }
  } catch (error) {
    // Malformed URL, return placeholder
  }
  return PLACEHOLDER_IMAGE_URL;
};

export default function Home() {
  const { toast } = useToast();
  const { connected, publicKey } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { rpcEndpoint } = useContext(RpcContext);
  const db = useFirestore();
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(true);
  const [userNfts, setUserNfts] = useState<UserNFT[]>([]);
  const [spamHostnames, setSpamHostnames] = useState<string[]>(['img.hi-hi.vip', 'nftstorage.link']);
  
  const isAdmin = useMemo(() => publicKey?.toBase58() === ALLOWED_LISTER_ADDRESS, [publicKey]);

  const fetchSpamList = useCallback(async () => {
    if (!db) return;
    try {
      const configDocRef = doc(db, 'appConfig', 'spamHostnames');
      const docSnap = await getDoc(configDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.hostnames && Array.isArray(data.hostnames)) {
          setSpamHostnames(data.hostnames);
        }
      }
    } catch (error) {
      console.error("Error fetching spam list:", error);
    }
  }, [db]);

  useEffect(() => {
    fetchSpamList();
  }, [fetchSpamList]);

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
            .filter((asset: any) => 
                asset.compression?.compressed &&
                asset.content?.metadata?.name &&
                asset.content.links?.image
            )
            .map((asset: any) => {
              let sourceHostname = 'unknown';
              let imageUrl = asset.content.links.image;
              try {
                const url = new URL(imageUrl);
                sourceHostname = url.hostname;
              } catch (e) {
                 // ignore malformed urls
              }

              return {
                id: asset.id,
                name: asset.content.metadata.name,
                imageUrl,
                sourceHostname,
                hint: 'user asset',
                compression: asset.compression,
              };
            });
            
          const nonSpam = fetchedNfts.filter(nft => !spamHostnames.includes(nft.sourceHostname));
          setUserNfts(nonSpam);

        } else {
            setUserNfts([]);
        }
    } catch (error) {
        console.error("Error fetching cNFTs:", error);
        toast({ title: "Failed to fetch NFTs", description: "Could not retrieve your cNFTs. Please check your RPC settings.", variant: "destructive" });
        setUserNfts([]);
    } finally {
        setIsLoading(false);
    }
  }, [publicKey, rpcEndpoint, toast, spamHostnames]);

  useEffect(() => {
    if (connected && rpcEndpoint) {
      fetchUserNfts();
    } else {
      setIsLoading(false);
      setUserNfts([]);
    }
  }, [connected, rpcEndpoint, fetchUserNfts]);


  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Solana cNFT Gallery
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Connect your wallet to view your compressed digital assets.
            </p>
          </div>
          
          {!connected && (
             <div className="text-center py-16 flex flex-col items-center justify-center gap-4">
                <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
                <p className="mt-2 text-muted-foreground">Please connect your wallet to see your cNFTs.</p>
                <Button onClick={() => setWalletModalVisible(true)}>Connect Wallet</Button>
            </div>
          )}

          {connected && !rpcEndpoint && (
             <div className="text-center py-16 flex flex-col items-center justify-center gap-4">
                <h2 className="text-2xl font-semibold">RPC Endpoint Required</h2>
                <p className="mt-2 text-muted-foreground">Please configure an RPC endpoint in settings to view your assets.</p>
                <Link href="/settings">
                    <Button>
                        <Settings className="h-5 w-5 mr-2" />
                        Go to Settings
                    </Button>
                </Link>
            </div>
          )}

          {connected && rpcEndpoint && isLoading && (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
            </div>
          )}

          {connected && rpcEndpoint && !isLoading && userNfts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {userNfts.map((nft) => (
                <Card key={nft.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1 bg-card">
                  <CardHeader className="p-0">
                    <div className="aspect-square relative w-full">
                      <Image
                        src={sanitizeImageUrl(nft.imageUrl)}
                        alt={nft.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        data-ai-hint={nft.hint ?? 'asset'}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow">
                    <CardTitle className="text-lg font-semibold">{nft.name}</CardTitle>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            connected && rpcEndpoint && !isLoading && (
              <div className="text-center py-16 flex flex-col items-center justify-center gap-4">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-2xl font-semibold">No cNFTs Found</h2>
                <p className="mt-2 text-muted-foreground">We couldn't find any compressed NFTs in your wallet.</p>
                <Button onClick={fetchUserNfts} variant="outline">Refresh</Button>
              </div>
            )
          )}

        </section>
      </main>
    </div>
  );
}
