"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderAction = void 0;
const core_1 = require("@elizaos/core");
const client_1 = require("../utils/client");
const utils_1 = require("./utils");
exports.createOrderAction = {
    name: "CREATE_ORDER",
    similes: ["PLACE_ORDER", "BUY", "SELL", "TRADE", "BET", "PLACE_BET", "EXECUTE_TRADE"],
    description: "Create a buy or sell order on Polymarket with smart order management",
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
        try {
            const { tools } = await (0, client_1.getPolymarketClient)();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);
            const orderContext = (0, core_1.composeContext)({
                state: currentState,
                template: `{{recentMessages}}

Extract order parameters from the conversation. Look for:
- Order type (buy/sell)
- Market ID or token address
- Amount or quantity to trade
- Price per token
- Side (YES/NO outcome)
- Order duration (GTC, FOK, IOC)
- Expiration time

Make sure all required parameters are clearly identified.`
            });
            const { object: params } = await (0, core_1.generateObject)({
                runtime,
                context: orderContext,
                modelClass: core_1.ModelClass.LARGE,
                schema: {
                    type: "object",
                    properties: {
                        tokenId: {
                            type: "string",
                            description: "Token ID for the market"
                        },
                        side: {
                            type: "string",
                            enum: ["BUY", "SELL"],
                            description: "Order side"
                        },
                        amount: {
                            type: "string",
                            description: "Amount to trade in USDC"
                        },
                        price: {
                            type: "string",
                            description: "Price per token (0.01-0.99)"
                        },
                        outcome: {
                            type: "string",
                            enum: ["YES", "NO"],
                            description: "Outcome to bet on"
                        },
                        type: {
                            type: "string",
                            enum: ["GTC", "FOK", "IOC"],
                            description: "Order type",
                            default: "GTC"
                        },
                        expiration: {
                            type: "number",
                            description: "Expiration timestamp (0 for no expiration)",
                            default: 0
                        }
                    },
                    required: ["tokenId", "side", "amount", "price"]
                }
            });
            const orderTool = tools.find(tool => tool.name?.toLowerCase().includes('order') ||
                tool.name?.toLowerCase().includes('trade') ||
                tool.name?.toLowerCase().includes('create'));
            if (!orderTool) {
                throw new Error("❌ Order tool not found in available tools");
            }
            console.log(`💹 Creating order with params:`, params);
            const result = await orderTool.execute?.(params) || await orderTool.call?.(params);
            const responseText = await (0, utils_1.generateResponse)(runtime, currentState, "CREATE_ORDER", result, "✅ Order created successfully! Your trade has been submitted to Polymarket.");
            callback?.({ text: responseText, content: result });
            return true;
        }
        catch (error) {
            return (0, utils_1.handleError)(error, "CREATE_ORDER", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Buy 10 YES tokens at 0.60 for market 12345" }
            },
            {
                user: "{{user2}}",
                content: { text: "Created buy order for 10 YES tokens at $0.60..." }
            }
        ]
    ]
};
