"use client";

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SolanaIcon } from '@/components/icons/solana-icon';

export type Asset = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  hint: string;
};

type AssetCardProps = {
  asset: Asset;
  onBuyClick: (asset: Asset) => void;
};

export function AssetCard({ asset, onBuyClick }: AssetCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1 bg-card">
      <CardHeader className="p-0">
        <div className="aspect-square relative w-full">
          <Image
            src={asset.imageUrl}
            alt={asset.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={asset.hint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold">{asset.name}</CardTitle>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center gap-2 text-lg font-bold text-primary">
          <SolanaIcon className="h-5 w-5" />
          <span>{asset.price} SOL</span>
        </div>
        <Button onClick={() => onBuyClick(asset)}>Buy Now</Button>
      </CardFooter>
    </Card>
  );
}
