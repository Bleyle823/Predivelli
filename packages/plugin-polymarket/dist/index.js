"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polymarketPlugin = void 0;
const wallet_1 = require("./providers/wallet");
const actions_1 = require("./actions");
// Epic startup banner
console.log("\n╔═════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                                                                                       ║");
console.log("║  ██████╗  ██████╗ ██╗   ██╗   ██╗███╗   ███╗ █████╗ ██████╗ ██╗  ██╗███████╗████████╗ ║");
console.log("║  ██╔══██╗██╔═══██╗██║   ╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝██╔════╝╚══██╔══╝ ║");
console.log("║  ██████╔╝██║   ██║██║    ╚████╔╝ ██╔████╔██║███████║██████╔╝█████╔╝ █████╗     ██║    ║");
console.log("║  ██╔═══╝ ██║   ██║██║     ╚██╔╝  ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ ██╔══╝     ██║    ║");
console.log("║  ██║     ╚██████╔╝███████╗ ██║   ██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗███████╗   ██║    ║");
console.log("║  ╚═╝      ╚═════╝ ╚══════╝ ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝    ║");
console.log("║                        🔮 PREDICTION MARKETS 🔮                                      ║");
console.log("║                                                                                       ║");
console.log("║    ┌─────────────────────────────────────────────────────────────────┐              ║");
console.log("║    │  📊 Real-time Market Data    │  🎯 Prediction Analytics         │              ║");
console.log("║    │  💹 Trading Interface       │  📈 Portfolio Tracking           │              ║");
console.log("║    │  🔍 Market Discovery        │  ⚡ Lightning Fast Updates       │              ║");
console.log("║    │  🛡️  Secure Transactions    │  🌐 Global Market Access         │              ║");
console.log("║    └─────────────────────────────────────────────────────────────────┘              ║");
console.log("║                                                                                       ║");
console.log("║                        Version: 1.0.0 | Build: PRODUCTION                           ║");
console.log("║                      Status: ✅ CONNECTED | ⚡ READY TO TRADE                      ║");
console.log("║                                                                                       ║");
console.log("╚═══════════════════════════════════════════════════════════════════════════════════════╝");
console.log("");
exports.polymarketPlugin = {
    name: "polymarket",
    description: "Advanced Polymarket prediction market integration with real-time trading, market analysis, and portfolio management",
    actions: actions_1.polymarketActions,
    providers: [wallet_1.walletProvider],
    evaluators: [],
    services: []
};
exports.default = exports.polymarketPlugin;
