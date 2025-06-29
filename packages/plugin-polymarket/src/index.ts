import type { Plugin } from "@elizaos/core";
import { polymarketProvider } from "./provider";
import { 
    placeBetAction, 
    checkBalanceAction, 
    getMarketsAction, 
    getMoreMarketsAction,
    getMarketAction,
    getHighActivityMarketsAction
} from "./actions";

// Initial banner
console.log("\n┌════════════════════════════════════════┐");
console.log("│        POLYMARKET PLUGIN               │");
console.log("├────────────────────────────────────────┤");
console.log("│  Initializing Polymarket Plugin...     │");
console.log("│  Version: 0.0.1                        │");
console.log("└════════════════════════════════════════┘");

const initializeActions = () => {
    try {
        // Test environment variables
        const host = process.env.CLOB_API_URL || "https://clob.polymarket.com";
        const chainId = process.env.CHAIN_ID || "137"; // Default to Polygon mainnet
        const apiKey = process.env.POLYMARKET_API_KEY;
        const secret = process.env.POLYMARKET_SECRET;
        const passphrase = process.env.POLYMARKET_PASSPHRASE;

        console.log(`🌐 Polymarket Host: ${host}`);
        console.log(`⛓️  Chain ID: ${chainId}`);
        
        if (apiKey && secret && passphrase) {
            console.log("🔐 Authenticated mode: Trading actions available");
        } else {
            console.log("📖 Read-only mode: Only market data actions available");
            console.log("   To enable trading, set POLYMARKET_API_KEY, POLYMARKET_SECRET, and POLYMARKET_PASSPHRASE");
        }

        // Return all actions - they will handle auth internally
        const actions = [
            getMarketsAction,
            getMoreMarketsAction, 
            getMarketAction,
            getHighActivityMarketsAction,
            checkBalanceAction,
            placeBetAction
        ];

        console.log("✔ Polymarket actions initialized successfully.");
        console.log(`📊 Available actions: ${actions.map(a => a.name).join(', ')}`);
        
        return actions;
    } catch (error) {
        console.error("❌ Failed to initialize Polymarket actions:", error);
        return []; // Return empty array instead of failing
    }
};

export const polymarketPlugin: Plugin = {
    name: "[Polymarket] Integration",
    description: "Polymarket prediction markets integration plugin - get market data and place bets",
    providers: [polymarketProvider],
    evaluators: [],
    services: [],
    actions: initializeActions(),
};

export default polymarketPlugin;

// Export individual actions for direct use
export {
    placeBetAction,
    checkBalanceAction, 
    getMarketsAction,
    getMoreMarketsAction,
    getMarketAction,
    getHighActivityMarketsAction
} from "./actions";

export { polymarketProvider, getPolymarketClient } from "./provider";