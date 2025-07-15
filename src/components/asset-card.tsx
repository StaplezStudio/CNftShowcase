
"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type Asset = {
  id: string;
  name: string;
  imageUrl: string;
  hint: string;
};

type AssetCardProps = {
  asset: Asset;
};

export function AssetCard({ asset }: AssetCardProps) {
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
    </Card>
  );
}

    