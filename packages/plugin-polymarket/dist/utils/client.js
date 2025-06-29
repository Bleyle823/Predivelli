"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPolymarketClient = getPolymarketClient;
exports.resetClient = resetClient;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
let clientInstance = null;
async function getPolymarketClient() {
    if (clientInstance) {
        return clientInstance;
    }
    // Validate required environment variables
    const config = {
        apiKey: process.env.POLYMARKET_API_KEY,
        apiSecret: process.env.POLYMARKET_SECRET,
        apiPassphrase: process.env.POLYMARKET_PASSPHRASE,
        walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
        rpcProviderUrl: process.env.RPC_PROVIDER_URL,
    };
    // Check for missing credentials
    const missingCredentials = Object.entries(config)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    if (missingCredentials.length > 0) {
        throw new Error(`Missing required environment variables: ${missingCredentials.join(', ')}. ` +
            "Please check your .env file and ensure all Polymarket credentials are set.");
    }
    try {
        // Create wallet client
        const account = (0, accounts_1.privateKeyToAccount)(config.walletPrivateKey);
        const walletClient = (0, viem_1.createWalletClient)({
            account: account,
            transport: (0, viem_1.http)(config.rpcProviderUrl),
            chain: chains_1.polygon,
        });
        // Get wallet balance for validation
        const balance = await walletClient.getBalance({
            address: account.address
        });
        console.log(`💰 Wallet Address: ${account.address}`);
        console.log(`💎 MATIC Balance: ${(0, viem_1.formatEther)(balance)} MATIC`);
        console.log(`🔧 Initialized Polymarket client`);
        clientInstance = { walletClient, account, balance };
        return clientInstance;
    }
    catch (error) {
        console.error("🚨 Failed to initialize Polymarket client:", error);
        throw new Error(`Failed to initialize Polymarket client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function resetClient() {
    clientInstance = null;
}
