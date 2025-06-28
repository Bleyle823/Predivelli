import { Wallet } from "@ethersproject/wallet";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ClobClient, Chain, ApiKeyCreds, SignatureType } from "@polymarket/clob-client";
import type { PolymarketConfig, PolymarketCredentials } from "../types";

let clientInstance: {
    clobClient: ClobClient;
    wallet: Wallet;
    address: string;
    balance: string;
    credentials?: ApiKeyCreds;
} | null = null;

export async function getPolymarketClient(): Promise<{
    clobClient: ClobClient;
    wallet: Wallet;
    address: string;
    balance: string;
    credentials?: ApiKeyCreds;
}> {
    if (clientInstance) {
        return clientInstance;
    }

    // Validate required environment variables
    const config: PolymarketConfig = {
        privateKey: process.env.PK!,
        chainId: (process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : Chain.POLYGON) as Chain,
        host: process.env.CLOB_API_URL || "https://clob.polymarket.com",
        rpcUrl: process.env.RPC_URL || "https://polygon-rpc.com",
        funderAddress: process.env.FUNDER_ADDRESS,
        signatureType: process.env.SIGNATURE_TYPE ? parseInt(process.env.SIGNATURE_TYPE) : 0,
        geoBlockToken: process.env.GEO_BLOCK_TOKEN,
        useServerTime: process.env.USE_SERVER_TIME === 'true'
    };

    // Check for missing credentials
    if (!config.privateKey) {
        throw new Error(
            "Missing required environment variable: PK (Private Key). " +
            "Please check your .env file and ensure your private key is set."
        );
    }

    try {
        // Create wallet and provider
        const wallet = new Wallet(config.privateKey);
        const provider = new JsonRpcProvider(config.rpcUrl);
        wallet.connect(provider);

        // Get wallet balance for validation
        const balance = await provider.getBalance(wallet.address);
        const balanceInMatic = balance.toString();

        console.log(`💰 Wallet Address: ${wallet.address}`);
        console.log(`💎 MATIC Balance: ${balanceInMatic} wei`);

        if (balance.isZero()) {
            console.warn("⚠️  Wallet has zero balance. You need MATIC for gas fees.");
        }

        // Initialize ClobClient
        const clobClient = new ClobClient(
            config.host,
            config.chainId,
            wallet,
            undefined, // No API credentials initially
            config.signatureType as SignatureType,
            config.funderAddress,
            config.geoBlockToken,
            config.useServerTime
        );

        // Try to create or derive API credentials
        let credentials: ApiKeyCreds | undefined;
        try {
            console.log("🔑 Creating or deriving API credentials...");
            credentials = await clobClient.createOrDeriveApiKey();
            console.log("✅ API credentials obtained successfully");
        } catch (error) {
            console.warn("⚠️  Failed to create API credentials:", error);
            console.log("ℹ️  Some features may be limited without API credentials");
        }

        console.log(`🔧 Initialized Polymarket client for chain ${config.chainId}`);

        clientInstance = { 
            clobClient, 
            wallet, 
            address: wallet.address, 
            balance: balanceInMatic,
            credentials 
        };
        return clientInstance;
    } catch (error) {
        console.error("🚨 Failed to initialize Polymarket client:", error);
        throw new Error(
            `Failed to initialize Polymarket client: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`
        );
    }
}

export async function getClobClient(): Promise<ClobClient> {
    const { clobClient } = await getPolymarketClient();
    return clobClient;
}

export async function getWallet(): Promise<Wallet> {
    const { wallet } = await getPolymarketClient();
    return wallet;
}

export async function getWalletAddress(): Promise<string> {
    const { address } = await getPolymarketClient();
    return address;
}

export async function getWalletBalance(): Promise<string> {
    const { balance } = await getPolymarketClient();
    return balance;
}

export async function getCredentials(): Promise<ApiKeyCreds | undefined> {
    const { credentials } = await getPolymarketClient();
    return credentials;
}

export function resetClient(): void {
    clientInstance = null;
}

// Helper function to format balance for display
export function formatBalance(balanceWei: string): string {
    const balance = parseFloat(balanceWei);
    if (balance >= 1e18) {
        return `${(balance / 1e18).toFixed(4)} MATIC`;
    } else if (balance >= 1e15) {
        return `${(balance / 1e15).toFixed(2)} mMATIC`;
    } else {
        return `${balance} wei`;
    }
}

// Helper function to validate token ID format
export function isValidTokenId(tokenId: string): boolean {
    // Polymarket token IDs are typically long numbers
    return /^\d+$/.test(tokenId) && tokenId.length > 10;
}

// Helper function to validate market ID format
export function isValidMarketId(marketId: string): boolean {
    // Market IDs can be alphanumeric with hyphens
    return /^[a-zA-Z0-9-]+$/.test(marketId);
}

// Helper function to calculate price impact
export function calculatePriceImpact(
    orderPrice: number,
    marketPrice: number
): number {
    return ((orderPrice - marketPrice) / marketPrice) * 100;
}

// Helper function to format price for display
export function formatPrice(price: number, decimals: number = 4): string {
    return price.toFixed(decimals);
}

// Helper function to format size for display
export function formatSize(size: number): string {
    if (size >= 1000) {
        return `${(size / 1000).toFixed(2)}k`;
    }
    return size.toFixed(2);
}

// Helper function to get readable side name
export function getSideName(side: string): string {
    return side === 'BUY' ? 'Buy' : 'Sell';
}

// Helper function to get readable order type name
export function getOrderTypeName(orderType: string): string {
    const typeMap: { [key: string]: string } = {
        'GTC': 'Good Till Cancelled',
        'FOK': 'Fill or Kill',
        'GTD': 'Good Till Date',
        'FAK': 'Fill and Kill'
    };
    return typeMap[orderType] || orderType;
} 