
/**
 * @fileOverview Firebase Cloud Functions for the SolSwapper application.
 *
 * This file contains the server-side logic for handling Solana transactions,
 * such as creating listing and delisting instructions for a marketplace.
 * The primary principle is to perform all sensitive operations and on-chain
 * data fetching on the server to ensure security and reliability.
 */

import { initializeApp } from "firebase-admin/app";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
    PublicKey,
    TransactionInstruction,
    SystemProgram
} from "@solana/web3.js";

// Initialize Firebase Admin SDK. This is required for all backend Firebase services.
initializeApp();

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

// This is a placeholder for a real marketplace program ID.
// For a real app, this would be the public key of the deployed marketplace contract.
// Example uses TensorSwap's Program ID.
const TENSOR_SWAP_PROGRAM_ID = new PublicKey('TSWAPamCemEuHa2vG5aE7wT6eJk2rleVvVSbSKv1p5p');
const BUBBLEGUM_PROGRAM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");


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
        // Use the DAS (Digital Asset Standard) API method `getAssetProof`.
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

        // Validate the response from the RPC. If it's missing key fields, we can't proceed.
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
        // Throw a specific HttpsError that the client can handle.
        throw new HttpsError("internal", "Could not fetch asset proof from RPC.", { originalError: error instanceof Error ? error.message : "Unknown error" });
    }
};


/**
 * A callable Cloud Function to create a secure listing instruction on the backend.
 * This function is called directly from the Next.js app.
 */
export const createListingTransaction = onCall<ListingData>({ cors: true }, async (request) => {
    // Step 1: Authentication & Validation
    // ===================================
    // Ensure the user is authenticated with Firebase Auth.
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to list an item.");
    }
    // Extract data from the client request.
    const { nftId, seller, price, rpcEndpoint, compression } = request.data;

    // Verify that the authenticated user is the one trying to list the asset.
    if (request.auth.token.sub !== seller) {
        throw new HttpsError("permission-denied", "You can only list your own assets.");
    }
    // Basic validation to ensure we have all the required data.
    if (!nftId || !price || price <= 0 || !rpcEndpoint || !compression?.tree) {
        throw new HttpsError("invalid-argument", "Missing required data for listing.");
    }

    logger.info(`Processing listing for NFT: ${nftId} by seller: ${seller} for ${price} SOL.`);

    try {

        // Step 2: Fetch Required On-Chain Data (Securely on the Server)
        // ==============================================================
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);
        logger.info(`Successfully fetched proof for NFT ${nftId}. Leaf index: ${leafIndex}`);


        // Step 3: Define Keys and Build the Transaction Instruction
        // ========================================================
        const { data_hash, creator_hash } = compression;
        if (!data_hash || !creator_hash) {
            throw new HttpsError("invalid-argument", "Compression data is incomplete.");
        }

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);

        // This is a program-derived address (PDA) required by the Bubblegum program.
        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID);

        // This is a placeholder for a real marketplace instruction.
        // The actual accounts and data would come from the marketplace's SDK documentation.
        const sellInstruction = new TransactionInstruction({
            programId: TENSOR_SWAP_PROGRAM_ID,
            keys: [
                { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                // ... other accounts required by the marketplace program like whitelist, mint, token accounts etc.
                { pubkey: treeConfig, isSigner: false, isWritable: false },
                { pubkey: rootPublicKey, isSigner: false, isWritable: false },
                { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                // The proof is passed as a series of "remaining accounts".
                ...proof.map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
                // System programs that are often required.
                { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            // The instruction data buffer is now a valid, empty buffer to prevent runtime errors.
            // A real implementation would serialize price and other arguments here.
            data: Buffer.alloc(0),
        });


        // Step 4: Serialize and Return the Instruction to the Client
        // ==========================================================
        const serializedInstruction = {
            programId: sellInstruction.programId.toBase58(),
            keys: sellInstruction.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(sellInstruction.data).toString("base64"),
        };

        logger.info(`Instruction for ${nftId} is ready for client-side transaction assembly.`);

        // Send the serialized instruction back to the client.
        return {
            success: true,
            message: "Instruction ready for signing.",
            instruction: serializedInstruction,
        };

    } catch (error: any) {
        logger.error("Error creating listing instruction:", error);
        // If any part of the process fails, throw an error the client can understand.
        throw new HttpsError("internal", "Could not create the listing instruction.", { message: error.message });
    }
});


/**
 * A callable Cloud Function to create a secure delisting instruction.
 * This follows the same pattern as the listing function.
 */
export const createCancelListingTransaction = onCall<CancelData>({ cors: true }, async (request) => {
    // Step 1: Authentication & Validation
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
        // Step 2: Fetch On-Chain Data
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);

        // Step 3: Build Instruction
        const { data_hash, creator_hash } = compression;
        if (!data_hash || !creator_hash) {
            throw new HttpsError("invalid-argument", "Compression data is incomplete.");
        }

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);
        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID);

        // This is a placeholder for a real marketplace `cancel_sell` instruction.
        const cancelInstruction = new TransactionInstruction({
            programId: TENSOR_SWAP_PROGRAM_ID,
            keys: [
                 { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                // ... other accounts required by the marketplace program
                { pubkey: treeConfig, isSigner: false, isWritable: false },
                { pubkey: rootPublicKey, isSigner: false, isWritable: false },
                { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                 ...proof.map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
                { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            // Using a valid, empty buffer to prevent runtime errors.
            data: Buffer.alloc(0),
        });

        // Step 4: Serialize and Return
        const serializedInstruction = {
            programId: cancelInstruction.programId.toBase58(),
            keys: cancelInstruction.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: Buffer.from(cancelInstruction.data).toString("base64"),
        };

        logger.info(`Cancel instruction for ${nftId} is ready for client-side transaction assembly.`);

        return {
            success: true,
            message: "Cancel instruction ready for signing.",
            instruction: serializedInstruction,
        };

    } catch (error: any) {
        logger.error("Error creating cancel instruction:", error);
        throw new HttpsError("internal", "Could not create the cancel instruction.", { message: error.message });
    }
});
