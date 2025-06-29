"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketInfoAction = void 0;
const core_1 = require("@elizaos/core");
const client_1 = require("../utils/client");
const utils_1 = require("./utils");
exports.getMarketInfoAction = {
    name: "GET_MARKET_INFO",
    similes: ["MARKET_DETAILS", "SHOW_MARKET", "VIEW_MARKET", "MARKET_INFO", "ANALYZE_MARKET", "MARKET_STATS"],
    description: "Get detailed information and analysis about a specific market",
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
        try {
            const { tools } = await (0, client_1.getPolymarketClient)();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);
            const marketContext = (0, core_1.composeContext)({
                state: currentState,
                template: `{{recentMessages}}

Extract the market identifier from the conversation. Look for:
- Market ID (long number)
- Market name or title
- Event name or description
- Token address
- Question being asked in the market

Be specific about which market the user wants details about.`
            });
            const { object: params } = await (0, core_1.generateObject)({
                runtime,
                context: marketContext,
                modelClass: core_1.ModelClass.LARGE,
                schema: {
                    type: "object",
                    properties: {
                        marketId: {
                            type: "string",
                            description: "Market ID or identifier"
                        },
                        tokenAddress: {
                            type: "string",
                            description: "Token contract address"
                        },
                        marketName: {
                            type: "string",
                            description: "Market name or question"
                        }
                    },
                    required: ["marketId"]
                }
            });
            const marketTool = tools.find(tool => (tool.name?.toLowerCase().includes('market') &&
                tool.name?.toLowerCase().includes('info')) ||
                tool.name?.toLowerCase().includes('details'));
            if (!marketTool) {
                throw new Error("❌ Market info tool not found in available tools");
            }
            console.log(`📊 Getting market info for:`, params);
            const result = await marketTool.execute?.(params) || await marketTool.call?.(params);
            const responseText = await (0, utils_1.generateResponse)(runtime, currentState, "GET_MARKET_INFO", result, "📈 Successfully retrieved detailed market information");
            callback?.({ text: responseText, content: result });
            return true;
        }
        catch (error) {
            return (0, utils_1.handleError)(error, "GET_MARKET_INFO", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Get detailed info for market ID 12345" }
            },
            {
                user: "{{user2}}",
                content: { text: "Here's the comprehensive market analysis..." }
            }
        ]
    ]
};
