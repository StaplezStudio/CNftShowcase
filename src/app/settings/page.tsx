
"use client";

import { useContext } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RpcContext } from '@/components/providers/rpc-provider';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { rpcEndpoint, setRpcEndpoint } = useContext(RpcContext);
  const { toast } = useToast();

  const handleSaveRpc = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newRpcEndpoint = formData.get('rpc') as string;

    if (!newRpcEndpoint) {
      toast({
        title: 'Invalid RPC URL',
        description: 'RPC endpoint cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Basic URL validation
      new URL(newRpcEndpoint);
      setRpcEndpoint(newRpcEndpoint);
      toast({
        title: 'RPC Endpoint Updated',
        description: 'The new RPC endpoint has been loaded and saved for your wallet.',
        className: 'bg-green-600 text-white border-green-600',
      });
    } catch (error) {
      toast({
        title: 'Invalid RPC URL',
        description: 'Please enter a valid URL for the RPC endpoint.',
        variant: 'destructive',
      });
    }
  };
  
  // This function is needed for the onListAssetClick prop of Header, but we don't need it on this page.
  const doNothing = () => {};

  return (
    <div className="flex min-h-screen flex-col">
      <Header onListAssetClick={doNothing} />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Settings
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Configure your application settings.
            </p>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
              <CardDescription>
                Set a custom RPC endpoint to connect to the Solana network (e.g., Devnet, Mainnet). Changes are saved to Firestore and linked to your wallet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRpc} className="flex flex-col sm:flex-row items-end gap-2">
                <div className="w-full">
                  <Label htmlFor="rpc" className="mb-2 block">RPC URL</Label>
                  <Input
                    id="rpc"
                    name="rpc"
                    defaultValue={rpcEndpoint}
                    className="flex-grow"
                    placeholder="https://api.devnet.solana.com"
                  />
                </div>
                <Button type="submit" className="w-full sm:w-auto flex-shrink-0">Load Custom RPC</Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
