import type { Plugin } from "@elizaos/core";
import { polymarketProvider } from "./provider";
import { polymarketActions } from "./actions";

// Initial banner
console.log("\n┌════════════════════════════════════════┐");
console.log("│        POLYMARKET PLUGIN               │");
console.log("├────────────────────────────────────────┤");
console.log("│  Initializing Polymarket Plugin...     │");
console.log("│  Version: 0.0.1                        │");
console.log("└════════════════════════════════════════┘");

export const polymarketPlugin: Plugin = {
    name: "[Polymarket] Integration",
    description: "Polymarket prediction market integration plugin",
    providers: [polymarketProvider],
    evaluators: [],
    services: [],
    actions: polymarketActions,
};

export default polymarketPlugin;

// Export types and utilities that might be useful
export * from "./provider";
export * from "./actions";

// Export function for testing
export async function getPolymarketActions() {
    return polymarketActions;
}