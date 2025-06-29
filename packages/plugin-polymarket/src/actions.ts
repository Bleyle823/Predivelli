import { type IAgentRuntime } from "@elizaos/core";
import { http } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { polymarket } from "@goat-sdk/plugin-polymarket";
import { viem } from "@goat-sdk/wallet-viem";

// Cache for the Polymarket client to avoid recreating it
let cachedPolymarketTools: any = null;

/**
 * Get Polymarket client using GOAT SDK
 */
export async function getPolymarketClient(runtime: IAgentRuntime): Promise<any> {
    try {
        // Return cached tools if available
        if (cachedPolymarketTools) {
            console.log("Returning cached Polymarket tools");
            return cachedPolymarketTools;
        }

        // Get environment variables from runtime settings
        const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
        const rpcUrl = runtime.getSetting("RPC_PROVIDER_URL") || process.env.RPC_PROVIDER_URL;
        const apiKey = runtime.getSetting("POLYMARKET_API_KEY") || process.env.POLYMARKET_API_KEY;
        const apiSecret = runtime.getSetting("POLYMARKET_SECRET") || process.env.POLYMARKET_SECRET;
        const passphrase = runtime.getSetting("POLYMARKET_PASSPHRASE") || process.env.POLYMARKET_PASSPHRASE;

        if (!privateKey) {
            throw new Error("WALLET_PRIVATE_KEY is required");
        }

        if (!rpcUrl) {
            throw new Error("RPC_PROVIDER_URL is required");
        }

        if (!apiKey || !apiSecret || !passphrase) {
            throw new Error("Polymarket API credentials (key, secret, passphrase) are required");
        }

        console.log("Creating Polymarket client with GOAT SDK...");

        // Create wallet account
        const account = privateKeyToAccount(privateKey as `0x${string}`);

        // Create wallet client
        const walletClient = createWalletClient({
            account: account,
            transport: http(rpcUrl),
            chain: polygon,
        });

        console.log("Wallet client created, getting onchain tools...");

        // Get onchain tools with Polymarket plugin
        const tools = await getOnChainTools({
            wallet: viem(walletClient),
            plugins: [
                polymarket({
                    credentials: {
                        key: apiKey as string,
                        secret: apiSecret as string,
                        passphrase: passphrase as string,
                    },
                }),
            ],
        });

        console.log("GOAT tools created successfully. Tool names:", Object.keys(tools));

        // Cache the tools
        cachedPolymarketTools = tools;

        return tools;
    } catch (error) {
        console.error("Error creating Polymarket client:", error);
        throw error;
    }
}

/**
 * Clear the cached client (useful for testing or if credentials change)
 */
export function clearPolymarketClientCache(): void {
    cachedPolymarketTools = null;
    console.log("Polymarket client cache cleared");
}

/**
 * Check if Polymarket client is configured
 */
export function isPolymarketConfigured(runtime: IAgentRuntime): boolean {
    const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
    const rpcUrl = runtime.getSetting("RPC_PROVIDER_URL") || process.env.RPC_PROVIDER_URL;
    const apiKey = runtime.getSetting("POLYMARKET_API_KEY") || process.env.POLYMARKET_API_KEY;
    const apiSecret = runtime.getSetting("POLYMARKET_SECRET") || process.env.POLYMARKET_SECRET;
    const passphrase = runtime.getSetting("POLYMARKET_PASSPHRASE") || process.env.POLYMARKET_PASSPHRASE;

    return !!(privateKey && rpcUrl && apiKey && apiSecret && passphrase);
}

/**
 * Get wallet address from runtime
 */
export function getWalletAddress(runtime: IAgentRuntime): string {
    const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error("WALLET_PRIVATE_KEY is required to get wallet address");
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return account.address;
}