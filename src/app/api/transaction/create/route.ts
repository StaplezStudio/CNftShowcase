
import { NextResponse } from 'next/server';
import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';

const TENSOR_SWAP_PROGRAM_ID_STR = 'TSWAPamCemEuHa2vG5aE7wT6eJk2rleVvVSbSKv1p5p';
const BUBBLEGUM_PROGRAM_ID_STR = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY";
const TOKEN_METADATA_PROGRAM_ID_STR = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const WRAPPED_SOL_MINT_STR = 'So11111111111111111111111111111111111111112';
const TCOMP_ADDR_STR = 'TCMPhJdwyeWeY3B12a2yAVStGmbd8Yv2h1z2NBv4jD8';
const TENSOR_WHITELIST_STR = 'whirLbMiF6OerGikP9AL3E2bT33h4A2g2scUpGj1a9t';
const AUTH_RULES_PROGRAM_ID_STR = 'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg';
const AUTH_RULES_ID_STR = 'eBJLFYPxJmMGquF3iSugaGgGwvscvjYnLnsDMpCRr5h';

const MAX_PROOF_ACCOUNTS = 17;

interface RequestBody {
    type: 'listing' | 'cancel';
    nftId: string;
    seller: string;
    price?: number;
    rpcEndpoint: string;
    compression: any;
}

const getAssetProofAndIndex = async (rpcEndpoint: string, assetId: string) => {
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

        if (!result?.proof || !result.root || result.leaf_index === undefined) {
             throw new Error('Failed to retrieve a valid asset proof. The RPC response is incomplete.');
        }

        return {
            proof: result.proof,
            root: result.root,
            leafIndex: result.leaf_index
        };
    } catch (error) {
        console.error("Error fetching asset proof:", error);
        throw new Error("Could not fetch asset proof from RPC.");
    }
};


export async function POST(request: Request) {
    try {
        const body: RequestBody = await request.json();
        const { type, nftId, seller, price, rpcEndpoint, compression } = body;

        if (!type || !nftId || !seller || !rpcEndpoint || !compression) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }
        
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);
        
        const { data_hash, creator_hash } = compression;
        if (!data_hash || !creator_hash) {
            return NextResponse.json({ message: 'Compression data is incomplete' }, { status: 400 });
        }

        const TENSOR_SWAP_PROGRAM_ID = new PublicKey(TENSOR_SWAP_PROGRAM_ID_STR);
        const BUBBLEGUM_PROGRAM_ID = new PublicKey(BUBBLEGUM_PROGRAM_ID_STR);

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);

        const [treeConfig] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID);
        
        let instruction;

        if (type === 'listing') {
            if (price === undefined || price <= 0) {
                return NextResponse.json({ message: 'Valid price is required for listing' }, { status: 400 });
            }

            instruction = new TransactionInstruction({
                programId: TENSOR_SWAP_PROGRAM_ID,
                keys: [
                    { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                    { pubkey: new PublicKey(WRAPPED_SOL_MINT_STR), isSigner: false, isWritable: false },
                    { pubkey: new PublicKey(TCOMP_ADDR_STR), isSigner: false, isWritable: true },
                    { pubkey: new PublicKey(TENSOR_WHITELIST_STR), isSigner: false, isWritable: false },
                    { pubkey: new PublicKey(AUTH_RULES_PROGRAM_ID_STR), isSigner: false, isWritable: false },
                    { pubkey: new PublicKey(AUTH_RULES_ID_STR), isSigner: false, isWritable: false },
                    { pubkey: TENSOR_SWAP_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: treeConfig, isSigner: false, isWritable: false },
                    { pubkey: rootPublicKey, isSigner: false, isWritable: false },
                    { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                    { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: new PublicKey(TOKEN_METADATA_PROGRAM_ID_STR), isSigner: false, isWritable: false },
                    ...proof.slice(0, MAX_PROOF_ACCOUNTS).map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
                ],
                data: Buffer.concat([
                    Buffer.from([0x61, 0x23, 0x58, 0x26, 0x22, 0x49, 0xf9, 0x3e]),
                    new BN(leafIndex).toArrayLike(Buffer, "le", 8),
                    new BN(price * 1e9).toArrayLike(Buffer, "le", 8),
                ]),
            });
        } else if (type === 'cancel') {
             // In a real app, you'd fetch the price from the listing stored in your DB.
             // For simplicity, we'll assume it might be passed or fetched differently.
             // Here we just need to build the instruction without price if not available.
            instruction = new TransactionInstruction({
                programId: TENSOR_SWAP_PROGRAM_ID,
                keys: [
                     { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                     { pubkey: new PublicKey(TCOMP_ADDR_STR), isSigner: false, isWritable: true },
                     { pubkey: new PublicKey(TENSOR_WHITELIST_STR), isSigner: false, isWritable: false },
                     { pubkey: TENSOR_SWAP_PROGRAM_ID, isSigner: false, isWritable: false },
                     { pubkey: treeConfig, isSigner: false, isWritable: false },
                     { pubkey: rootPublicKey, isSigner: false, isWritable: false },
                     { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                     { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                     { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                     { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                     { pubkey: new PublicKey(TOKEN_METADATA_PROGRAM_ID_STR), isSigner: false, isWritable: false },
                     ...proof.slice(0, MAX_PROOF_ACCOUNTS).map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
                ],
                // The cancel instruction for TensorSwap might need the price as well.
                // This is a simplified example; refer to the specific marketplace's documentation.
                // The discriminator for cancel is typically different.
                data: Buffer.concat([
                    Buffer.from([0x58, 0x18, 0x85, 0x89, 0x02, 0x76, 0x24, 0x05]), // cancel_sell discriminator
                ]),
            });
        } else {
            return NextResponse.json({ message: 'Invalid transaction type' }, { status: 400 });
        }

        const serializedInstruction = {
            programId: instruction.programId.toBase58(),
            keys: instruction.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(instruction.data).toString("base64"),
        };
        
        return NextResponse.json({ data: { success: true, instruction: serializedInstruction } });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ message: error.message || 'An unknown error occurred' }, { status: 500 });
    }
}
