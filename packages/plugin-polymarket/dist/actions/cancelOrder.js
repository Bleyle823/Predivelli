"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrderAction = void 0;
const core_1 = require("@elizaos/core");
const client_1 = require("../utils/client");
const utils_1 = require("./utils");
exports.cancelOrderAction = {
    name: "CANCEL_ORDER",
    similes: ["CANCEL", "REMOVE_ORDER", "DELETE_ORDER", "CANCEL_TRADE"],
    description: "Cancel a specific order by ID",
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
        try {
            const { tools } = await (0, client_1.getPolymarketClient)();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);
            const cancelContext = (0, core_1.composeContext)({
                state: currentState,
                template: `{{recentMessages}}

Extract the order ID to cancel from the conversation. Look for:
- Order ID (specific number or string)
- Order number
- Order reference
- "Cancel order X" where X is the identifier

Be specific about which order to cancel.`
            });
            const { object: params } = await (0, core_1.generateObject)({
                runtime,
                context: cancelContext,
                modelClass: core_1.ModelClass.LARGE,
                schema: {
                    type: "object",
                    properties: {
                        orderId: {
                            type: "string",
                            description: "Order ID to cancel"
                        }
                    },
                    required: ["orderId"]
                }
            });
            const cancelTool = tools.find(tool => tool.name?.toLowerCase().includes('cancel'));
            if (!cancelTool) {
                throw new Error("❌ Cancel order tool not found in available tools");
            }
            console.log(`❌ Cancelling order:`, params.orderId);
            const result = await cancelTool.execute?.(params) || await cancelTool.call?.(params);
            const responseText = await (0, utils_1.generateResponse)(runtime, currentState, "CANCEL_ORDER", result, "✅ Order cancelled successfully! The order has been removed from the market.");
            callback?.({ text: responseText, content: result });
            return true;
        }
        catch (error) {
            return (0, utils_1.handleError)(error, "CANCEL_ORDER", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Cancel order 67890" }
            },
            {
                user: "{{user2}}",
                content: { text: "✅ Order 67890 has been successfully cancelled" }
            }
        ]
    ]
};
