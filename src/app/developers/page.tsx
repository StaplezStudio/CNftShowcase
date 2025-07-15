
"use client";

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info, Terminal, Database, Code, Folder, File as FileIcon, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
                
                <AccordionItem value="item-5">
                    <AccordionTrigger>
                        <CardTitle className="flex items-center gap-2 text-left"><Wrench className="h-6 w-6" /> Building the Cloud Functions</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card>
                             <CardHeader className="pt-0">
                                <CardDescription>
                                     A guide to creating and building the server-side Cloud Functions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>The core logic of this app resides in the Firebase Cloud Functions. Crucially, the `functions` directory is a self-contained Node.js project. You do **not** need the main Next.js application running to develop, build, or test the functions.</p>
                                
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="step-1">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 1: The Goal - Security First</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>The primary reason for using a Cloud Function is to avoid building transactions on the client. The client (the user's browser) is an untrusted environment. By building instructions on a secure backend, we ensure that the correct on-chain data is always used, preventing exploits.</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="step-2">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 2: Install Function Dependencies</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>The functions have their own `package.json` and dependencies. Before you can build or test them, you must install these. Open your terminal, navigate into the functions directory, and install.</p>
                                            <pre className="bg-muted p-3 rounded-md text-sm"><code className="font-code">{`C:\\Users\\YourUser\\path\\to\\project> cd functions
C:\\Users\\YourUser\\path\\to\\project\\functions> npm install`}</code></pre>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="step-3">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 3: Develop Your Function</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>Your function code lives in `functions/src/index.ts`. You can edit this file to add new functions or modify existing ones. The key is to define a `callable` function that can be invoked from our Next.js app.</p>
                                            <pre className="bg-muted p-3 rounded-md text-sm"><code className="font-code">{`import { onCall } from "firebase-functions/v2/https";

export const myNewFunction = onCall<RequestData>({ cors: true }, async (request) => {
    // Function logic goes here...
});`}</code></pre>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="step-4">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 4: Build the Functions</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>Cloud Functions run on Node.js, so your TypeScript code must be compiled into JavaScript. From within the `functions` directory, run the build command. This will create a `lib` folder with the compiled output.</p>
                                             <pre className="bg-muted p-3 rounded-md text-sm"><code className="font-code">{`C:\\Users\\YourUser\\path\\to\\project\\functions> npm run build`}</code></pre>
                                            <p>You must re-run this command every time you make a change to your function's code.</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                     <AccordionItem value="step-5">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 5: Test Locally</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>After building, you can test your functions using the Firebase Emulator Suite. The command to start the emulators must be run from the **root** of the project, not the `functions` directory. See the "Local Testing Setup" section for more details.</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
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
                                    A step-by-step guide to testing the Firebase Cloud Functions on a Windows 11 machine.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-muted-foreground">
                                <p>To debug Cloud Functions effectively, you must run them locally using the Firebase Emulator Suite. This avoids slow and painful "deploy-and-see" testing. These instructions are for a developer who has cloned the project and is using the Windows 11 Command Prompt (`cmd`).</p>
                                
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="step-prereq">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Prerequisites</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>You have <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Node.js</a> installed on your machine.</li>
                                                <li>You have cloned this project's repository to your local machine.</li>
                                                <li>You have opened the Command Prompt in the root directory of the project.</li>
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="step-1-test">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 1: Install the Firebase CLI</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>The Firebase Command Line Interface (CLI) is a powerful tool for managing and testing Firebase projects. If you don't have it installed, run the following command in your terminal. The `-g` flag installs it globally on your system.</p>
                                            <pre className="bg-muted p-3 rounded-md text-sm"><code className="font-code">npm install -g firebase-tools</code></pre>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="step-2-test">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 2: Log In to Firebase</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>Next, you need to connect the CLI to your Firebase account. This command will open a new browser window for you to authenticate with Google. Follow the prompts to allow Firebase access.</p>
                                            <pre className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap"><code className="font-code">{
`C:\\Users\\YourUser\\path\\to\\project> firebase login
? Allow Firebase to collect CLI and Emulator Suite usage and error reporting information? (Y/n) Y

Visit this URL on this device to log in:
https://accounts.google.com/o/oauth2/v2/auth?scope=...

Waiting for authentication...

✔  Success! Logged in as you@example.com`
                                            }</code></pre>
                                            <p className="mt-2 text-sm text-muted-foreground">After logging in, you can return to your terminal.</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="step-3-test">
                                        <AccordionTrigger>
                                            <h4 className="font-semibold text-foreground">Step 3: Start the Local Emulators</h4>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p>From the **root directory** of this project, run the following command. This will download and start a local emulator for Cloud Functions. The `--only functions` flag tells it we only need to emulate the functions service for now. Make sure you have built your functions first (see the "Building the Cloud Functions" section).</p>
                                            <pre className="bg-muted p-3 rounded-md text-sm"><code className="font-code">{`C:\\Users\\YourUser\\path\\to\\project> firebase emulators:start --only functions`}</code></pre>
                                            <p>Once the emulators are running, you will see a table in your terminal showing which services are running and on which ports. This Next.js app is already configured to automatically detect and use these local emulators. You can now test the listing and cancellation flows from the app, and any logs or errors from your Cloud Functions will be printed directly in your terminal.</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
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
                                    An overview of the collections used in Firestore for this application.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 text-muted-foreground">
                                <div>
                                    <h4 className="font-semibold text-foreground">`userConfig/{'{walletAddress}'}`</h4>
                                    <p className="mt-1">
                                        This document stores user-specific configurations, keyed by their Solana wallet address.
                                    </p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1">
                                        <li><code className="font-mono text-xs bg-muted p-1 rounded">savedRpcEndpoints</code>: An array of RPC URLs the user has saved.</li>
                                        <li><code className="font-mono text-xs bg-muted p-1 rounded">activeRpcEndpoint</code>: The string URL of the currently active RPC for the user.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">`appConfig/spamHostnames`</h4>
                                     <p className="mt-1">
                                        This is a global configuration document for the entire application.
                                    </p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1">
                                       <li><code className="font-mono text-xs bg-muted p-1 rounded">hostnames</code>: An array of image source hostnames (e.g., "bad-nft-images.com") to be automatically hidden from the main gallery view.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">`listings/{'{nftId}'}`</h4>
                                    <p className="mt-1">
                                        When a user initiates a listing, a document is temporarily created here, keyed by the NFT's address. It is removed upon successful cancellation or if the listing fails.
                                    </p>
                                     <ul className="list-disc pl-5 mt-2 space-y-1">
                                       <li><code className="font-mono text-xs bg-muted p-1 rounded">status</code>: The current state of the listing ('pending', 'listed', 'failed').</li>
                                       <li><code className="font-mono text-xs bg-muted p-1 rounded">price</code>: The listing price in SOL.</li>
                                       <li><code className="font-mono text-xs bg-muted p-1 rounded">seller</code>: The wallet address of the user who owns the asset.</li>
                                    </ul>
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
                    <DialogTitle>Making the Transaction Instruction</DialogTitle>
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
