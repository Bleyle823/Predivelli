import type { Plugin } from "@elizaos/core";
import { walletProvider } from "./provider";
import { getPolymarketActions } from "./actions";

// Initial banner
console.log("\n┌════════════════════════════════════════┐");
console.log("│          POLYMARKET PLUGIN             │");
console.log("├────────────────────────────────────────┤");
console.log("│  Initializing Polymarket Plugin...     │");
console.log("│  Version: 1.0.0 (CLOB Client)          │");
console.log("└════════════════════════════════════════┘");

const initializeActions = async () => {
    try {
        // Check environment variables but don't fail if wallet isn't configured
        const clobApiUrl = process.env.CLOB_API_URL || process.env.POLYMARKET_API_URL;
        const chainId = process.env.CHAIN_ID;
        const walletPrivateKey = process.env.WALLET_PRIVATE_KEY || process.env.POLYMARKET_PRIVATE_KEY;
        const rpcProviderUrl = process.env.RPC_PROVIDER_URL || process.env.POLYGON_RPC_URL;

        console.log("Environment check:");
        console.log(`- CLOB API URL: ${clobApiUrl || 'https://clob.polymarket.com (default)'}`);
        console.log(`- Chain ID: ${chainId || '137 (default)'}`);
        console.log(`- Wallet configured: ${walletPrivateKey ? '✓' : '✗'}`);
        console.log(`- RPC URL configured: ${rpcProviderUrl ? '✓' : '✗'}`);

        if (!walletPrivateKey || !rpcProviderUrl) {
            console.warn("⚠️  Wallet not configured - Trading actions will not be available");
            console.warn("   Set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL for full functionality");
        }

        const actions = await getPolymarketActions();
        console.log(`✔ Polymarket actions initialized successfully (${actions.length} actions).`);
        
        // List available actions
        console.log("\nAvailable actions:");
        actions.forEach(action => {
            console.log(`  - ${action.name}`);
        });
        
        return actions;
    } catch (error) {
        console.error("❌ Failed to initialize Polymarket actions:", error);
        return []; // Return empty array instead of failing
    }
};

export const polymarketPlugin: Plugin = {
    name: "[Polymarket] CLOB Integration",
    description: "Polymarket prediction market integration using CLOB client - supports market browsing, trading, and portfolio management",
    providers: [walletProvider],
    evaluators: [],
    services: [],
    actions: await initializeActions(),
};

export default polymarketPlugin;