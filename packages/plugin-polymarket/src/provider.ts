import type { Provider, IAgentRuntime } from "@elizaos/core";
import { ClobClient, Chain } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";
import * as fs from 'fs';
import * as path from 'path';

// Load API credentials from JSON file
function loadApiCredentials(): { key: string; secret: string; passphrase: string } | null {
    try {
        // Try to load from the agent directory first
        const agentPath = path.join(process.cwd(), 'agent', 'polymarket_api_keys.json');
        const rootPath = path.join(process.cwd(), 'polymarket_api_keys.json');
        
        let credentialsPath = null;
        if (fs.existsSync(agentPath)) {
            credentialsPath = agentPath;
        } else if (fs.existsSync(rootPath)) {
            credentialsPath = rootPath;
        }
        
        if (credentialsPath) {
            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            return credentials;
        }
        
        return null;
    } catch (error) {
        console.error("Failed to load API credentials:", error);
        return null;
    }
}

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

export async function getAuthenticatedPolymarketClient(runtime: IAgentRuntime): Promise<ClobClient> {
    // Get configuration from environment variables or runtime settings
    const host = process.env.CLOB_API_URL || "https://clob.polymarket.com";
    const chainId = parseInt(`${process.env.CHAIN_ID || Chain.POLYGON}`) as Chain;
    
    // Get wallet private key from runtime settings or environment variables
    let privateKey = process.env.PK || process.env.PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
    
    if (!privateKey) {
        try {
            privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") as string;
        } catch (error) {
            console.log("Could not load private key from runtime settings:", error);
        }
    }
    
    if (!privateKey) {
        throw new Error("Wallet private key is required for authenticated operations! Please set WALLET_PRIVATE_KEY in environment variables or runtime settings.");
    }
    
    // Try to get credentials from environment variables first, then from runtime settings, then from JSON file
    let apiKey = process.env.POLYMARKET_API_KEY;
    let secret = process.env.POLYMARKET_SECRET;
    let passphrase = process.env.POLYMARKET_PASSPHRASE;
    
    // If not in environment variables, try to get from runtime settings
    if (!apiKey || !secret || !passphrase) {
        try {
            apiKey = apiKey || runtime.getSetting("POLYMARKET_API_KEY") as string;
            secret = secret || runtime.getSetting("POLYMARKET_SECRET") as string;
            passphrase = passphrase || runtime.getSetting("POLYMARKET_PASSPHRASE") as string;
            
            if (apiKey && secret && passphrase) {
                console.log("🔐 Loaded Polymarket credentials from runtime settings");
            }
        } catch (error) {
            console.log("Could not load credentials from runtime settings:", error);
        }
    }
    
    // If still not available, try to load from JSON file
    if (!apiKey || !secret || !passphrase) {
        const credentials = loadApiCredentials();
        if (credentials) {
            apiKey = credentials.key;
            secret = credentials.secret;
            passphrase = credentials.passphrase;
            console.log("🔐 Loaded Polymarket credentials from JSON file");
        }
    }
    
    if (!apiKey || !secret || !passphrase) {
        throw new Error("API Credentials are needed to interact with this endpoint! Please set POLYMARKET_API_KEY, POLYMARKET_SECRET, and POLYMARKET_PASSPHRASE in environment variables, runtime settings, or provide a polymarket_api_keys.json file.");
    }

    try {
        // Create wallet from private key
        const wallet = new Wallet(privateKey);
        console.log("🔐 Wallet created with address:", wallet.address);
        
        // Initialize ClobClient with host, chainId, and wallet
        const client = new ClobClient(host, chainId, wallet);
        
        // Store credentials in the client instance for later use
        // The ClobClient may need these for signing operations
        (client as any).apiCredentials = {
            key: apiKey,
            secret: secret,
            passphrase: passphrase
        };
        
        console.log("🔐 Polymarket client created with wallet signer");
        return client;
    } catch (error) {
        console.error("Failed to initialize authenticated Polymarket ClobClient:", error);
        throw new Error(`Failed to initialize authenticated Polymarket ClobClient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const polymarketProvider: Provider = {
    async get(runtime: IAgentRuntime): Promise<string | null> {
        try {
            const client = await getPolymarketClient();
            
            // Test the connection by fetching markets and analyzing active ones
            const markets = await client.getMarkets();
            let totalCount = 0;
            let activeCount = 0;
            let acceptingOrdersCount = 0;
            
            if (Array.isArray(markets)) {
                totalCount = markets.length;
                // Count active markets
                activeCount = markets.filter((market: any) => market.active !== false).length;
                acceptingOrdersCount = markets.filter((market: any) => market.accepting_orders !== false).length;
            } else if (markets && typeof markets === 'object') {
                const response = markets as any;
                if (response.data && Array.isArray(response.data)) {
                    totalCount = response.data.length;
                    activeCount = response.data.filter((market: any) => market.active !== false).length;
                    acceptingOrdersCount = response.data.filter((market: any) => market.accepting_orders !== false).length;
                }
            }
            
            const status = acceptingOrdersCount > 0 ? "🟢" : 
                          (activeCount > 0 ? "🟡" : "🔴");
            
            return `Polymarket Client: ${status} Connected (${totalCount} total, ${activeCount} active, ${acceptingOrdersCount} accepting orders)`;
        } catch (error) {
            console.error("Error in Polymarket provider:", error);
            return `❌ Error connecting to Polymarket: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    },
};

// Legacy provider for backward compatibility
export const walletProvider = polymarketProvider;

// Legacy function for backward compatibility  
export const getClient = getPolymarketClient;