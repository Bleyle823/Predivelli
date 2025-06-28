import type { Provider, IAgentRuntime } from "@elizaos/core";
import { ClobClient, AssetType } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";
import * as fs from "fs";

const WALLET_DATA_FILE = "polymarket_wallet_data.txt";
const API_KEYS_FILE = "polymarket_api_keys.json";

interface ApiKeyData {
    key: string;
    secret: string;
    passphrase: string;
}

export async function getPolymarketClient(): Promise<ClobClient> {
    // Validate required environment variables
    const privateKey = process.env.POLYMARKET_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("Missing required POLYMARKET_PRIVATE_KEY environment variable.");
    }

    const host = process.env.POLYMARKET_HOST || 'https://clob.polymarket.com';
    const chainId = parseInt(process.env.POLYMARKET_CHAIN_ID || '137'); // Polygon mainnet
    const funder = process.env.POLYMARKET_FUNDER || '0x993f563E24efee863BbD0E54FD5Ca3d010202c39';
    const signatureType = 0; // Browser wallet type

    try {
        const wallet = new Wallet(privateKey);
        let apiKeys: ApiKeyData | null = null;

        // Try to load existing API keys
        if (fs.existsSync(API_KEYS_FILE)) {
            try {
                const keyData = fs.readFileSync(API_KEYS_FILE, "utf8");
                apiKeys = JSON.parse(keyData);
            } catch (error) {
                console.warn("Error reading API keys, will create new ones:", error);
            }
        }

        // Create or derive API keys if not available
        if (!apiKeys) {
            console.log("Creating new API keys...");
            const tempClient = new ClobClient(host, chainId, wallet);
            const creds = await tempClient.createOrDeriveApiKey();
            
            apiKeys = {
                key: creds.key,
                secret: creds.secret,
                passphrase: creds.passphrase
            };

            // Save API keys for future use
            fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
            console.log("API keys created successfully");
        }

        // Create authenticated client
        const client = new ClobClient(
            host,
            chainId,
            wallet,
            apiKeys,
            signatureType,
            funder
        );

        return client;
    } catch (error) {
        console.error("Failed to initialize Polymarket client:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize Polymarket client: ${errorMessage}`);
    }
}

export const polymarketProvider: Provider = {
    async get(runtime: IAgentRuntime): Promise<string | null> {
        try {
            const client = await getPolymarketClient();
            
            // Get wallet address
            const wallet = new Wallet(process.env.POLYMARKET_PRIVATE_KEY!);
            const address = await wallet.getAddress();
            
            // Get USDC balance and allowance
            const balanceAllowance = await client.getBalanceAllowance({
                asset_type: AssetType.COLLATERAL
            });

            return `Polymarket Wallet:
Address: ${address}
USDC Balance: ${balanceAllowance.balance}
USDC Allowance: ${balanceAllowance.allowance}`;
        } catch (error) {
            console.error("Error in Polymarket provider:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return `Error connecting to Polymarket: ${errorMessage}`;
        }
    },
};