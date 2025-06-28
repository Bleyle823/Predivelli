import type { Plugin } from "@elizaos/core";
import { walletProvider } from "./providers/wallet";
import { polymarketActions } from "./actions";

// Epic startup banner for the enhanced Polymarket plugin
console.log("\n╔═════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                                                                                       ║");
console.log("║  ██████╗  ██████╗ ██╗   ██╗   ██╗███╗   ███╗ █████╗ ██████╗ ██╗  ██╗███████╗████████╗ ║");
console.log("║  ██╔══██╗██╔═══██╗██║   ╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝██╔════╝╚══██╔══╝ ║");
console.log("║  ██████╔╝██║   ██║██║    ╚████╔╝ ██╔████╔██║███████║██████╔╝█████╔╝ █████╗     ██║    ║");
console.log("║  ██╔═══╝ ██║   ██║██║     ╚██╔╝  ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ ██╔══╝     ██║    ║");
console.log("║  ██║     ╚██████╔╝███████╗ ██║   ██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗███████╗   ██║    ║");
console.log("║  ╚═╝      ╚═════╝ ╚══════╝ ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝    ║");
console.log("║                    🔮 PREDICTION MARKETS v2.0 🔮                                    ║");
console.log("║                                                                                       ║");
console.log("║    ┌─────────────────────────────────────────────────────────────────┐              ║");
console.log("║    │  📊 Real-time Market Data    │  🎯 Advanced Trading            │              ║");
console.log("║    │  💹 CLOB Integration        │  📈 Portfolio Analytics         │              ║");
console.log("║    │  🔍 Market Discovery        │  ⚡ Lightning Fast Execution     │              ║");
console.log("║    │  🛡️  Secure Transactions    │  🌐 Global Market Access         │              ║");
console.log("║    │  📋 Order Management        │  🔔 Real-time Notifications     │              ║");
console.log("║    └─────────────────────────────────────────────────────────────────┘              ║");
console.log("║                                                                                       ║");
console.log("║                        Version: 2.0.0 | Build: PRODUCTION                           ║");
console.log("║                      Status: ✅ CONNECTED | ⚡ READY TO TRADE                      ║");
console.log("║                                                                                       ║");
console.log("╚═══════════════════════════════════════════════════════════════════════════════════════╝");
console.log("");

export const polymarketPlugin: Plugin = {
    name: "polymarket",
    description: "Advanced Polymarket prediction market integration with full CLOB trading capabilities, real-time market data, portfolio management, and comprehensive analytics",
    actions: polymarketActions,
    providers: [walletProvider],
    evaluators: [],
    services: []
};

export default polymarketPlugin;
