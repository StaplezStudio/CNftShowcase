
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Info } from 'lucide-react';


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
    <Dialog>
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

                <Card>
                    <CardHeader>
                        <CardTitle>Developer Info</CardTitle>
                        <CardDescription>
                            Information about how the application constructs transactions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            This application uses Firebase Cloud Functions to securely build transaction
                            instructions on the server. Click the button below for more details.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Info className="mr-2 h-4 w-4" />
                                View Instruction Details
                            </Button>
                        </DialogTrigger>
                    </CardFooter>
                </Card>
            </div>

            </section>
        </main>
        </div>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Transaction Instruction Breakdown</DialogTitle>
                <DialogDescription>
                    This is a simplified overview of the data sent to the backend to create a listing or cancellation instruction.
                </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground space-y-4 py-4">
                <p>
                    When you list or cancel an item, the frontend does not build the transaction itself. Instead, it calls a secure Firebase Cloud Function. This is a best practice to protect against various issues and keep sensitive logic off the client.
                </p>
                <div>
                    <h4 className="font-semibold text-foreground mb-2">Data Sent to the Cloud Function:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><code className="font-mono bg-muted p-1 rounded">nftId</code>: The unique address of the compressed NFT.</li>
                        <li><code className="font-mono bg-muted p-1 rounded">seller</code>: Your public wallet address.</li>
                        <li><code className="font-mono bg-muted p-1 rounded">price</code>: The listing price in SOL (for listings only).</li>
                        <li><code className="font-mono bg-muted p-1 rounded">rpcEndpoint</code>: The RPC you selected, which the function uses to get on-chain data.</li>
                        <li><code className="font-mono bg-muted p-1 rounded">compression</code>: An object containing details about the Merkle tree the cNFT belongs to (e.g., tree address, data_hash, creator_hash).</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-foreground mb-2">What the Cloud Function Does:</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Authenticates your request to ensure you are the legitimate owner.</li>
                        <li>Calls the Solana RPC to get the latest <code className="font-mono bg-muted p-1 rounded">asset proof</code>. This is a cryptographic proof of ownership and is required for all cNFT interactions.</li>
                        <li>Builds a <code className="font-mono bg-muted p-1 rounded">TransactionInstruction</code> using the accounts and data required by the marketplace program (e.g., TensorSwap).</li>
                        <li>Serializes this instruction and sends it back to your browser.</li>
                    </ol>
                </div>
                <p>
                    Your browser then receives this single instruction, combines it with a recent blockhash, and asks you to sign and send the final transaction. This way, the complex and sensitive parts are handled securely on the backend.
                p>
            </div>
        </DialogContent>
    </Dialog>
  );
}
