"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelAllOrdersAction = void 0;
const client_1 = require("../utils/client");
const utils_1 = require("./utils");
exports.cancelAllOrdersAction = {
    name: "CANCEL_ALL_ORDERS",
    similes: ["CANCEL_ALL", "REMOVE_ALL_ORDERS", "DELETE_ALL_ORDERS", "CLEAR_ORDERS"],
    description: "Cancel all active orders for the connected wallet",
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
        try {
            const { tools } = await (0, client_1.getPolymarketClient)();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);
            const cancelAllTool = tools.find(tool => tool.name?.toLowerCase().includes('cancel') &&
                tool.name?.toLowerCase().includes('all'));
            if (!cancelAllTool) {
                throw new Error("❌ Cancel all orders tool not found in available tools");
            }
            console.log(`🗑️ Cancelling all active orders...`);
            const result = await cancelAllTool.execute?.({}) || await cancelAllTool.call?.({});
            const responseText = await (0, utils_1.generateResponse)(runtime, currentState, "CANCEL_ALL_ORDERS", result, "✅ All active orders have been successfully cancelled!");
            callback?.({ text: responseText, content: result });
            return true;
        }
        catch (error) {
            return (0, utils_1.handleError)(error, "CANCEL_ALL_ORDERS", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Cancel all my orders" }
            },
            {
                user: "{{user2}}",
                content: { text: "✅ All your active orders have been cancelled successfully" }
            }
        ]
    ]
};
