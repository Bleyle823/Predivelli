"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveOrdersAction = void 0;
const client_1 = require("../utils/client");
const utils_1 = require("./utils");
exports.getActiveOrdersAction = {
    name: "GET_ACTIVE_ORDERS",
    similes: ["LIST_ORDERS", "SHOW_ORDERS", "VIEW_ORDERS", "MY_ORDERS", "OPEN_ORDERS", "PENDING_ORDERS"],
    description: "Get all active orders for the connected wallet with detailed status",
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
        try {
            const { tools } = await (0, client_1.getPolymarketClient)();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);
            const ordersTool = tools.find(tool => tool.name?.toLowerCase().includes('orders') ||
                (tool.name?.toLowerCase().includes('get') && tool.name?.toLowerCase().includes('order')));
            if (!ordersTool) {
                throw new Error("❌ Get orders tool not found in available tools");
            }
            console.log(`📋 Fetching active orders...`);
            const result = await ordersTool.execute?.({}) || await ordersTool.call?.({});
            const responseText = await (0, utils_1.generateResponse)(runtime, currentState, "GET_ACTIVE_ORDERS", result, "📊 Successfully retrieved your active orders and portfolio status");
            callback?.({ text: responseText, content: result });
            return true;
        }
        catch (error) {
            return (0, utils_1.handleError)(error, "GET_ACTIVE_ORDERS", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Show me all my active orders" }
            },
            {
                user: "{{user2}}",
                content: { text: "Here's your complete order portfolio..." }
            }
        ]
    ]
};
