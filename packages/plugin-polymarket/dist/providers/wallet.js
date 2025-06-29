"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletProvider = void 0;
const viem_1 = require("viem");
const client_1 = require("../utils/client");
exports.walletProvider = {
    async get(runtime) {
        try {
            const { account, balance } = await (0, client_1.getPolymarketClient)();
            const balanceInMatic = (0, viem_1.formatEther)(balance);
            return JSON.stringify({
                address: account.address,
                balance: `${balanceInMatic} MATIC`,
                network: "Polygon",
                status: "Connected",
                timestamp: new Date().toISOString()
            }, null, 2);
        }
        catch (error) {
            console.error("🚨 Error in Polymarket provider:", error);
            return JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
                status: "Failed to connect",
                timestamp: new Date().toISOString()
            }, null, 2);
        }
    },
};
