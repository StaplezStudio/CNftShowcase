
"use client";

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info, Terminal, Database, Code, Folder, File as FileIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CodeViewer, projectFiles } from '@/components/code-viewer';

type SelectedFile = {
  name: string;
  content: string;
} | null;

const FileTree = ({ files, onFileClick, level = 0 }: { files: any[], onFileClick: (file: { name: string, content: string }) => void, level?: number }) => (
    <div className="text-sm">
        {files.map(item => (
            <div key={item.name} style={{ paddingLeft: `${level * 1.5}rem` }}>
                {item.type === 'folder' ? (
                    <div className="my-1">
                        <div className="flex items-center gap-2 font-semibold">
                            <Folder className="h-4 w-4" />
                            <span>{item.name}</span>
                        </div>
                        <FileTree files={item.children} onFileClick={onFileClick} level={level + 1} />
                    </div>
                ) : (
                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                        onClick={() => onFileClick(item)}
                    >
                        <FileIcon className="h-4 w-4" />
                        <span>{item.name}</span>
                    </div>
                )}
            </div>
        ))}
    </div>
);


export default function DevelopersPage() {
    const [selectedFile, setSelectedFile] = useState<SelectedFile>(null);
    const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
    const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);

    const handleFileClick = (file: { name: string, content: string }) => {
        setSelectedFile(file);
        setIsSourceDialogOpen(true);
    };

    return (
    <>
        <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
            <section className="container mx-auto px-4 py-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Developer Hub
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Technical documentation, setup instructions, and architecture overview.
                </p>
            </div>
            
            <Accordion type="single" collapsible className="w-full max-w-4xl mx-auto">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <CardTitle className="flex items-center gap-2 text-left"><Code className="h-6 w-6" /> App Architecture</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardHeader className="pt-0">
                                <CardDescription>
                                    A high-level overview of how the SolSwapper application works.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>
                                    SolSwapper is a Next.js application designed to interact with the Solana blockchain. To ensure security and reliability, it uses a client-server architecture where sensitive operations are handled by server-side Firebase Cloud Functions.
                                </p>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li><strong className="text-foreground">Client-Side (Next.js):</strong> The frontend, built with React and ShadCN UI, is responsible for displaying user assets and capturing user intent (e.g., "I want to list this NFT for 0.5 SOL").</li>
                                    <li><strong className="text-foreground">Server-Side (Firebase Cloud Functions):</strong> When a user wants to list or cancel a listing, the client sends a request to a dedicated Cloud Function.</li>
                                    <li><strong className="text-foreground">Secure Instruction Building:</strong> The Cloud Function performs the heavy lifting. It fetches the latest on-chain data (like the cNFT's proof), builds the correct transaction instruction for the marketplace program, and serializes it.</li>
                                    <li><strong className="text-foreground">Client-Side Signing:</strong> The function returns the serialized instruction to the client. The client's only job is to wrap this instruction in a transaction, get the user's signature via their wallet, and send it to the blockchain.</li>
                                </ol>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" onClick={() => setIsInstructionDialogOpen(true)}>
                                    <Info className="mr-2 h-4 w-4" />
                                    View Instruction Details
                                </Button>
                            </CardFooter>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                    <AccordionTrigger>
                        <CardTitle className="flex items-center gap-2 text-left"><Folder className="h-6 w-6" /> Source Code</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card>
                             <CardHeader className="pt-0">
                                <CardDescription>
                                    Browse the project's source code. Click a file to view its contents.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground max-h-96 overflow-y-auto">
                                <FileTree files={projectFiles} onFileClick={handleFileClick} />
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                    <AccordionTrigger>
                        <CardTitle className="flex items-center gap-2 text-left"><Terminal className="h-6 w-6" /> Local Testing Setup</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card>
                             <CardHeader className="pt-0">
                                <CardDescription>
                                    Follow these steps to test the Firebase Cloud Functions on your local machine before deploying.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>To debug Cloud Functions effectively, you must run them locally using the Firebase Emulator Suite. This avoids slow and painful "deploy-and-see" testing.</p>
                                <h4 className="font-semibold text-foreground">Step 1: Install Firebase CLI</h4>
                                <p>If you haven't already, install the Firebase Command Line Interface. You will need <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Node.js</a> installed.</p>
                                <pre className="bg-muted p-3 rounded-md text-sm"><code className="font-code">npm install -g firebase-tools</code></pre>
                                
                                <h4 className="font-semibold text-foreground">Step 2: Log In to Firebase</h4>
                                <p>Connect the CLI to your Firebase account. This command will open a new browser window for you to authenticate with Google. Follow the prompts to allow Firebase access.</p>
                                <pre className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap"><code className="font-code">{
`$ firebase login
? Allow Firebase to collect CLI and Emulator Suite usage and error reporting information? (Y/n) Y

Visit this URL on this device to log in:
https://accounts.google.com/o/oauth2/v2/auth?scope=...

Waiting for authentication...

✔  Success! Logged in as you@example.com`
                                }</code></pre>
                                <p className="mt-2 text-sm text-muted-foreground">After logging in, you can return to your terminal.</p>
                                
                                <h4 className="font-semibold text-foreground">Step 3: Start the Emulators</h4>
                                <p>From the root directory of this project, run the following command. This will start a local emulator for Cloud Functions.</p>
                                <pre className="bg-muted p-3 rounded-md text-sm"><code className="font-code">firebase emulators:start --only functions</code></pre>

                                <p>Once the emulators are running, this Next.js app will automatically detect and use them for any Cloud Function calls. You can now test listing and cancellation flows locally, and any errors will be printed directly in your terminal where you ran the command.</p>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                    <AccordionTrigger>
                        <CardTitle className="flex items-center gap-2 text-left"><Database className="h-6 w-6" /> Firestore Data Structure</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardHeader className="pt-0">
                                <CardDescription>
                                    Overview of the collections used in Firestore.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <div>
                                    <h4 className="font-semibold text-foreground">`userConfig/{'{walletAddress}'}`</h4>
                                    <p>Stores user-specific settings, currently just their saved RPC endpoints.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">`appConfig/spamHostnames`</h4>
                                    <p>A global configuration document containing an array of image source hostnames to be considered as spam.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">`listings/{'{nftId}'}`</h4>
                                    <p>Stores the state of an asset listed on the marketplace, including price, seller, and status (`pending`, `listed`, etc.).</p>
                                </div>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            </section>
        </main>
        </div>
        
        <Dialog open={isInstructionDialogOpen} onOpenChange={setIsInstructionDialogOpen}>
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
                    </p>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{selectedFile?.name}</DialogTitle>
                </DialogHeader>
                {selectedFile && (
                    <CodeViewer code={selectedFile.content} />
                )}
            </DialogContent>
        </Dialog>
    </>
  );
}
