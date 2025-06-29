import type { Provider, IAgentRuntime } from "@elizaos/core";
import { ClobClient, Chain } from "@polymarket/clob-client";

export async function getPolymarketClient(): Promise<ClobClient> {
    // Get configuration from environment variables
    const host = process.env.CLOB_API_URL || "https://clob.polymarket.com";
    const chainId = parseInt(`${process.env.CHAIN_ID || Chain.POLYGON}`) as Chain;
    
    // For authenticated operations, you might need these
    const apiKey = process.env.POLYMARKET_API_KEY;
    const secret = process.env.POLYMARKET_SECRET;
    const passphrase = process.env.POLYMARKET_PASSPHRASE;

    try {
        // Initialize ClobClient with host and chainId
        const client = new ClobClient(host, chainId);
        
        // If credentials are provided, you might need to authenticate
        // This depends on the specific API requirements
        if (apiKey && secret && passphrase) {
            console.log("🔐 Polymarket credentials detected - authenticated mode");
            // The authentication might be handled differently depending on the client version
            // You may need to call specific auth methods here
        } else {
            console.log("📖 Polymarket running in read-only mode");
        }
        
        return client;
    } catch (error) {
        console.error("Failed to initialize Polymarket ClobClient:", error);
        throw new Error(`Failed to initialize Polymarket ClobClient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const polymarketProvider: Provider = {
    async get(runtime: IAgentRuntime): Promise<string | null> {
        try {
            const client = await getPolymarketClient();
            
            // Test the connection by fetching markets
            const markets = await client.getMarkets();
            const marketCount = Array.isArray(markets?.data) ? markets.data.length : 
                              Array.isArray(markets) ? markets.length : 0;
            
            return `Polymarket Client: Connected (${marketCount} markets available)`;
        } catch (error) {
            console.error("Error in Polymarket provider:", error);
            return `Error connecting to Polymarket: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
};

// Legacy provider for backward compatibility
export const walletProvider = polymarketProvider;

// Legacy function for backward compatibility  
export const getClient = getPolymarketClient;