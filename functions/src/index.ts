
/**
 * @fileOverview Firebase Cloud Functions for the SolSwapper application.
 *
 * This file contains the server-side logic for handling Solana transactions,
 * such as creating listings on a marketplace like Magic Eden.
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { 
    Connection, 
    PublicKey, 
    Transaction, 
    TransactionInstruction,
    sendAndConfirmTransaction,
    SystemProgram,
    VersionedTransaction,
    AddressLookupTableAccount,
    MessageV0
} from "@solana/web3.js";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Define a type for the data expected by the function
interface ListingData {
    nftId: string;
    seller: string;
    price: number;
    rpcEndpoint: string;
    compression: any;
}

// These would be the actual public keys for the Magic Eden marketplace program
// Using placeholders for now.
const MAGIC_EDEN_PROGRAM_ID = new PublicKey("M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5C2vVvrvY");
const TENSOR_SWAP_PROGRAM_ID = new PublicKey('TSWAPamCemEuHa2vG5aE7wT6eJk2rleVvVSbSKv1p5p');


/**
 * Fetches the asset proof from a given RPC endpoint.
 * This is a crucial step for verifying ownership of a compressed NFT.
 * @param rpcEndpoint The URL of the RPC endpoint to use.
 * @param assetId The ID of the asset to fetch the proof for.
 * @returns The asset proof.
 * @throws HttpsError if the proof cannot be fetched or is invalid.
 */
const getAssetProof = async (rpcEndpoint: string, assetId: string) => {
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
        if (!result?.proof || !result.root) {
            throw new Error('Failed to retrieve a valid asset proof. The RPC response is incomplete.');
        }
        return result;
    } catch (error) {
        logger.error("Error fetching asset proof:", error);
        throw new HttpsError("internal", "Could not fetch asset proof from RPC.", error);
    }
};


/**
 * A callable function to create a secure listing transaction on the backend.
 * This function interacts with a marketplace program (e.g., Magic Eden).
 */
export const createListingTransaction = onCall<ListingData>(async (request) => {
    // 1. AUTHENTICATION & VALIDATION
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to list an item.");
    }
    const sellerWallet = request.auth.token.sub;
    const { nftId, seller, price, rpcEndpoint, compression } = request.data;
    
    if (sellerWallet !== seller) {
        throw new HttpsError("permission-denied", "You can only list your own assets.");
    }
    if (!nftId || !price || price <= 0 || !rpcEndpoint || !compression || !compression.tree) {
        throw new HttpsError("invalid-argument", "Missing required data for listing.");
    }

    logger.info(`Processing listing for NFT: ${nftId} by seller: ${seller} for ${price} SOL.`);

    try {
        const connection = new Connection(rpcEndpoint, 'confirmed');

        // 2. FETCH REQUIRED ON-CHAIN DATA (SERVER-SIDE)
        const assetProof = await getAssetProof(rpcEndpoint, nftId);
        const { proof, root } = assetProof;

        // 3. DEFINE KEYS AND BUILD INSTRUCTION
        // Destructure necessary fields from compression data
        const { data_hash, creator_hash, leaf_id } = compression;
        if (!data_hash || !creator_hash || leaf_id === undefined || leaf_id === null) {
            throw new HttpsError("invalid-argument", "Compression data is incomplete.");
        }

        const treePublicKey = new PublicKey(compression.tree);
        const rootPublicKey = new PublicKey(root);
        const dataHashPublicKey = new PublicKey(data_hash);
        const creatorHashPublicKey = new PublicKey(creator_hash);
        const sellerPublicKey = new PublicKey(seller);
        const leafIndex = leaf_id;

        const [treeConfig, _treeBump] = PublicKey.findProgramAddressSync([treePublicKey.toBuffer()], BUBBLEGUM_PROGRAM_ID);
        
        // This is a placeholder for a real marketplace instruction.
        // The actual accounts and instruction data would come from the marketplace's SDK/documentation.
        const sellInstruction = new TransactionInstruction({
            programId: TENSOR_SWAP_PROGRAM_ID, // Using TensorSwap as an example program
            keys: [
                { pubkey: sellerPublicKey, isSigner: true, isWritable: true },
                // ... other accounts required by the marketplace program
                { pubkey: treeConfig, isSigner: false, isWritable: false },
                { pubkey: BUBBLEGUM_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            // The instruction data would be specific to the marketplace's `sell` or `list` instruction
            // and would include price, proof, hashes, etc.
            data: Buffer.from("PLACEHOLDER_INSTRUCTION_DATA"), 
        });

        // 4. BUILD AND SERIALIZE THE TRANSACTION
        const latestBlockhash = await connection.getLatestBlockhash();
        const message = MessageV0.compile({
            payerKey: sellerPublicKey,
            instructions: [sellInstruction],
            recentBlockhash: latestBlockhash.blockhash,
            addressLookupTableAccounts: [],
        });
        
        const transaction = new VersionedTransaction(message);

        const serializedTransaction = Buffer.from(transaction.serialize()).toString("base64");

        // 5. UPDATE FIRESTORE AND RETURN
        await db.doc(`listings/${nftId}`).update({ status: 'awaiting-signature' });
        logger.info(`Listing for ${nftId} is ready for client signature.`);

        return {
            success: true,
            message: "Transaction ready for signing.",
            transaction: serializedTransaction,
        };

    } catch (error: any) {
        logger.error("Error creating listing transaction:", error);
        await db.doc(`listings/${nftId}`).update({
            status: "failed",
            error: error.message || "An unknown error occurred on the backend.",
        });
        throw new HttpsError("internal", "Could not create the listing transaction.", { message: error.message });
    }
});
