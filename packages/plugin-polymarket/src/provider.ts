import type { Provider, IAgentRuntime } from "@elizaos/core";
import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { polymarket } from "@goat-sdk/plugin-polymarket";
import { viem } from "@goat-sdk/wallet-viem";

// Define the return type for the function
type PolymarketClient = {
    tools: Awaited<ReturnType<typeof getOnChainTools>>;
    walletClient: ReturnType<typeof createWalletClient>;
    account: ReturnType<typeof privateKeyToAccount>;
};

export async function getPolymarketClient(runtime?: IAgentRuntime): Promise<PolymarketClient> {
    // Validate required environment variables
    const apiKey = runtime?.getSetting("POLYMARKET_API_KEY") || process.env.POLYMARKET_API_KEY;
    const apiSecret = runtime?.getSetting("POLYMARKET_SECRET") || process.env.POLYMARKET_SECRET;
    const apiPassphrase = runtime?.getSetting("POLYMARKET_PASSPHRASE") || process.env.POLYMARKET_PASSPHRASE;
    const walletPrivateKey = runtime?.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
    const rpcProviderUrl = runtime?.getSetting("RPC_PROVIDER_URL") || process.env.RPC_PROVIDER_URL;

    if (!apiKey || !apiSecret || !apiPassphrase) {
        throw new Error("Missing required Polymarket API credentials. Please set POLYMARKET_API_KEY, POLYMARKET_SECRET, and POLYMARKET_PASSPHRASE environment variables or in character settings.");
    }

    if (!walletPrivateKey || !rpcProviderUrl) {
        throw new Error("Missing required wallet configuration. Please set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL environment variables or in character settings.");
    }

    try {
        // Create wallet client
        const account = privateKeyToAccount(walletPrivateKey as `0x${string}`);
        const walletClient = createWalletClient({
            account: account,
            transport: http(rpcProviderUrl),
            chain: polygon,
        });

        // Create Polymarket tools
        const tools = await getOnChainTools({
            wallet: viem(walletClient),
            plugins: [
                polymarket({
                    credentials: {
                        key: apiKey,
                        secret: apiSecret,
                        passphrase: apiPassphrase,
                    },
                }),
            ],
        });

        return { tools, walletClient, account };
    } catch (error) {
        console.error("Failed to initialize Polymarket client:", error);
        throw new Error(`Failed to initialize Polymarket client: ${error.message || 'Unknown error'}`);
    }
}

export const walletProvider: Provider = {
    async get(runtime: IAgentRuntime): Promise<string | null> {
        try {
            const { account } = await getPolymarketClient(runtime);
            return `Polymarket Wallet Address: ${account.address}`;
        } catch (error) {
            console.error("Error in Polymarket provider:", error);
            return `Error initializing Polymarket wallet: ${error.message}`;
        }
    },
};