
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
      description: `The RPC endpoint has been set for this session.`,
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
