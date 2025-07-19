
/**
 * @fileOverview Firebase Cloud Functions for the SolSwapper application.
 *
 * This file contains the server-side logic for handling Solana transactions,
 * such as creating listing and delisting instructions for a marketplace.
 * The primary principle is to perform all sensitive operations and on-chain
 * data fetching on the server to ensure security and reliability.
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
    PublicKey,
    TransactionInstruction,
    SystemProgram
} from "@solana/web3.js";
import BN from "bn.js";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID_KEY } from "@metaplex-foundation/mpl-bubblegum";

// Initialize Firebase Admin SDK. This is required for all backend Firebase services.
initializeApp();
const db = getFirestore();

// Define Program IDs as simple strings.
// They will be converted to PublicKey objects *inside* the function handlers.
const TENSOR_SWAP_PROGRAM_ID_STR = 'TSWAPamCemEuHa2vG5aE7wT6eJk2rleVvVSbSKv1p5p';
const TOKEN_METADATA_PROGRAM_ID_STR = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const WRAPPED_SOL_MINT_STR = 'So11111111111111111111111111111111111111112';
const TCOMP_ADDR_STR = 'TCMPhJdwyeWeY3B12a2yAVStGmbd8Yv2h1z2NBv4jD8';
const TENSOR_WHITELIST_STR = 'whirLbMiF6OerGikP9AL3E2bT33h4A2g2scUpGj1a9t';
const AUTH_RULES_PROGRAM_ID_STR = 'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg';
const AUTH_RULES_ID_STR = 'eBJLFYPxJmMGquF3iSugaGgGwvscvjYnLnsDMpCRr5h';

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
        logger.error("Error fetching asset proof:", error);
        throw new HttpsError("internal", "Could not fetch asset proof from RPC.", { originalError: error instanceof Error ? error.message : "Unknown error" });
    }
};


/**
 * A callable Cloud Function to create a secure listing instruction on the backend.
 * This function is called directly from the Next.js app.
 */
export const createListingTransaction = onCall<ListingData>({ cors: true }, async (request) => {
    // Instantiate PublicKeys *inside* the function call to prevent startup errors.
    const TENSOR_SWAP_PROGRAM_ID = new PublicKey(TENSOR_SWAP_PROGRAM_ID_STR);

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to list an item.");
    }
    const { nftId, seller, price, rpcEndpoint, compression } = request.data;

    if (request.auth.token.sub !== seller) {
        throw new HttpsError("permission-denied", "You can only list your own assets.");
    }

    if (!nftId || !price || price <= 0 || !rpcEndpoint || !compression?.tree) {
        throw new HttpsError("invalid-argument", "Missing required data for listing.");
    }

    logger.info(`Processing listing for NFT: ${nftId} by seller: ${seller} for ${price} SOL.`);

    try {
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);
        logger.info(`Successfully fetched proof for NFT ${nftId}. Leaf index: ${leafIndex}`);

        const { data_hash, creator_hash } = compression;
        if (!data_hash || !creator_hash) {
            throw new HttpsError("invalid-argument", "Compression data is incomplete.");
        }

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);

        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID_KEY);
        
        const sellInstruction = new TransactionInstruction({
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
                { pubkey: BUBBLEGUM_PROGRAM_ID_KEY, isSigner: false, isWritable: false },
                { pubkey: new PublicKey(TOKEN_METADATA_PROGRAM_ID_STR), isSigner: false, isWritable: false },
                ...proof.slice(0, 17).map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
            ],
            data: Buffer.concat([
                Buffer.from([0x61, 0x23, 0x58, 0x26, 0x22, 0x49, 0xf9, 0x3e]), // sell discriminator
                new BN(leafIndex).toArrayLike(Buffer, "le", 8),
                new BN(price * 1e9).toArrayLike(Buffer, "le", 8),
            ]),
        });

        const serializedInstruction = {
            programId: sellInstruction.programId.toBase58(),
            keys: sellInstruction.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(sellInstruction.data).toString("base64"),
        };

        return {
            success: true,
            message: "Instruction ready for signing.",
            instruction: serializedInstruction,
        };

    } catch (error: any) {
        logger.error("Error creating listing instruction:", error);
        throw new HttpsError("internal", "Could not create the listing instruction.", { message: error.message });
    }
});


/**
 * A callable Cloud Function to create a secure delisting instruction.
 */
export const createCancelListingTransaction = onCall<CancelData>({ cors: true }, async (request) => {
    // Instantiate PublicKeys *inside* the function call to prevent startup errors.
    const TENSOR_SWAP_PROGRAM_ID = new PublicKey(TENSOR_SWAP_PROGRAM_ID_STR);

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

    logger.info(`Processing cancel instruction for NFT: ${nftId} by seller: ${seller}.`);

    try {
        const listingDoc = await db.collection("listings").doc(nftId).get();
        if (!listingDoc.exists) {
            throw new HttpsError("not-found", "Listing not found in database.");
        }
        const listingData = listingDoc.data() as ListingData;
        const price = listingData.price;
        if (price === undefined) {
             throw new HttpsError("internal", "Listing price could not be retrieved.");
        }

        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);

        const { data_hash, creator_hash } = compression;
        if (!data_hash || !creator_hash) {
            throw new HttpsError("invalid-argument", "Compression data is incomplete.");
        }

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);
        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID_KEY);

        const cancelInstruction = new TransactionInstruction({
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
                 { pubkey: BUBBLEGUM_PROGRAM_ID_KEY, isSigner: false, isWritable: false },
                 { pubkey: new PublicKey(TOKEN_METADATA_PROGRAM_ID_STR), isSigner: false, isWritable: false },
                 ...proof.slice(0,17).map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
            ],
            data: Buffer.concat([
                Buffer.from([0x58, 0x18, 0x85, 0x89, 0x02, 0x76, 0x24, 0x05]), // cancel_sell discriminator
                new BN(price * 1e9).toArrayLike(Buffer, "le", 8),
            ]),
        });

        const serializedInstruction = {
            programId: cancelInstruction.programId.toBase58(),
            keys: cancelInstruction.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(cancelInstruction.data).toString("base64"),
        };

        return {
            success: true,
            message: "Cancel instruction ready for signing.",
            instruction: serializedInstruction,
        };

    } catch (error: any) {
        logger.error("Error creating cancel instruction:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Could not create the cancel instruction.", { message: error.message });
    }
});
