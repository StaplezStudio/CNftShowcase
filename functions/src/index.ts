
/**
 * @fileOverview Firebase Cloud Functions for the SolSwapper application.
 *
 * This file contains the server-side logic for handling Solana transactions,
 * such as creating listing and delisting instructions for a marketplace.
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
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

interface ListingData {
    nftId: string;
    seller: string;
    price: number;
    rpcEndpoint: string;
    compression: any;
}

interface CancelData {
    nftId: string;
    seller: string;
    rpcEndpoint: string;
    compression: any;
}

// Using TensorSwap as an example marketplace program ID
const TENSOR_SWAP_PROGRAM_ID = new PublicKey('TSWAPamCemEuHa2vG5aE7wT6eJk2rleVvVSbSKv1p5p');

/**
 * Fetches the asset proof and leaf index from a given RPC endpoint.
 * This is a crucial step for verifying ownership and location of a compressed NFT.
 * @param rpcEndpoint The URL of the RPC endpoint to use.
 * @param assetId The ID of the asset to fetch the proof for.
 * @returns The asset proof and leaf index.
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
                params: {
                    id: assetId
                },
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
        throw new HttpsError("internal", "Could not fetch asset proof from RPC.", error);
    }
};


/**
 * A callable function to create a secure listing instruction on the backend.
 * This function interacts with a marketplace program (e.g., TensorSwap).
 */
export const createListingTransaction = onCall<ListingData>({ cors: true }, async (request) => {
    // 1. AUTHENTICATION & VALIDATION
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to list an item.");
    }
    const { nftId, seller, price, rpcEndpoint, compression } = request.data;

    if (request.auth.token.sub !== seller) {
        throw new HttpsError("permission-denied", "You can only list your own assets.");
    }
    if (!nftId || !price || price <= 0 || !rpcEndpoint || !compression || !compression.tree) {
        throw new HttpsError("invalid-argument", "Missing required data for listing.");
    }

    logger.info(`Processing listing instruction for NFT: ${nftId} by seller: ${seller} for ${price} SOL.`);

    try {
        // 2. FETCH REQUIRED ON-CHAIN DATA (SERVER-SIDE)
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);

        // 3. DEFINE KEYS AND BUILD INSTRUCTION
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

        // This is a placeholder for a real marketplace instruction.
        // The actual accounts and instruction data would come from the marketplace's SDK/documentation.
        const sellInstruction = new TransactionInstruction({
            programId: TENSOR_SWAP_PROGRAM_ID,
            keys: [
                { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                // ... other accounts required by the marketplace program like whitelist, mint, token accounts etc.
                { pubkey: treeConfig, isSigner: false, isWritable: false },
                { pubkey: rootPublicKey, isSigner: false, isWritable: false },
                { pubkey: dataHashPublicKey, isSigner: false, isWritable: false },
                { pubkey: creatorHashPublicKey, isSigner: false, isWritable: false },
                // Pass the proof as remaining accounts
                 ...proof.map((p: string) => ({ pubkey: new PublicKey(p), isSigner: false, isWritable: false })),
                // System programs
                { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            // The instruction data would be specific to the marketplace's `sell` or `list` instruction
            // and would include price, proof hashes, leaf index, etc.
            data: Buffer.from(`PLACEHOLDER_SELL_INSTRUCTION_FOR_PRICE_${price}_AND_INDEX_${leafIndex}`),
        });

        // 4. SERIALIZE AND RETURN THE INSTRUCTION
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
 * A callable function to create a secure delisting instruction on the backend.
 */
export const createCancelListingTransaction = onCall<CancelData>({ cors: true }, async (request) => {
    // 1. AUTHENTICATION & VALIDATION
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to manage listings.");
    }
    const { nftId, seller, rpcEndpoint, compression } = request.data;
    if (request.auth.token.sub !== seller) {
        throw new HttpsError("permission-denied", "You can only cancel your own listings.");
    }
    if (!nftId || !rpcEndpoint || !compression || !compression.tree) {
        throw new HttpsError("invalid-argument", "Missing required data for cancellation.");
    }

    logger.info(`Processing cancel instruction for NFT: ${nftId} by seller: ${seller}.`);

    try {
        // 2. FETCH REQUIRED ON-CHAIN DATA (SERVER-SIDE)
        const { proof, root, leafIndex } = await getAssetProofAndIndex(rpcEndpoint, nftId);

        // 3. DEFINE KEYS AND BUILD INSTRUCTION
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
            data: Buffer.from(`PLACEHOLDER_CANCEL_INSTRUCTION_FOR_INDEX_${leafIndex}`),
        });

        // 4. SERIALIZE AND RETURN THE INSTRUCTION
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

    