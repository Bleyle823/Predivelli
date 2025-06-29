import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    generateObject,
} from "@elizaos/core";
import { getClobClient } from "../utils/client";
import { generateResponse, handleError } from "./utils";

export const getMarketInfoAction: Action = {
    name: "GET_MARKET_INFO",
    similes: ["MARKET_DETAILS", "SHOW_MARKET", "VIEW_MARKET", "MARKET_INFO", "ANALYZE_MARKET", "MARKET_STATS"],
    description: "Get detailed information and analysis about a specific market",
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const clobClient = await getClobClient();
            
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);

            const marketContext = composeContext({
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

            const { object: params } = await generateObject({
                runtime,
                context: marketContext,
                modelClass: ModelClass.LARGE,
                schema: {
                    type: "object",
                    properties: {
                        marketId: { 
                            type: "string", 
                            description: "Market ID or identifier" 
                        },
                        tokenId: { 
                            type: "string", 
                            description: "Token ID for the market" 
                        },
                        marketName: {
                            type: "string",
                            description: "Market name or question"
                        }
                    },
                    required: ["marketId"]
                }
            });

            console.log(`📊 Getting market info for:`, params);
            
            // Get market details
            const market = await clobClient.getMarket(params.marketId);
            
            // Get order book for the market
            let orderBook = null;
            let tickSize = null;
            let negRisk = null;
            let lastTradePrice = null;
            let spread = null;
            let midpoint = null;
            
            if (params.tokenId) {
                try {
                    orderBook = await clobClient.getOrderBook(params.tokenId);
                    tickSize = await clobClient.getTickSize(params.tokenId);
                    negRisk = await clobClient.getNegRisk(params.tokenId);
                    lastTradePrice = await clobClient.getLastTradePrice(params.tokenId);
                    spread = await clobClient.getSpread(params.tokenId);
                    midpoint = await clobClient.getMidpoint(params.tokenId);
                } catch (error) {
                    console.warn("Could not fetch additional market data:", error);
                }
            }

            const result = {
                market,
                orderBook,
                tickSize,
                negRisk,
                lastTradePrice,
                spread,
                midpoint,
                analysis: {
                    hasOrderBook: !!orderBook,
                    hasTickSize: !!tickSize,
                    hasNegRisk: !!negRisk,
                    hasLastTrade: !!lastTradePrice,
                    hasSpread: !!spread,
                    hasMidpoint: !!midpoint
                }
            };

            const responseText = await generateResponse(
                runtime,
                currentState,
                "GET_MARKET_INFO",
                result,
                "📈 Successfully retrieved detailed market information"
            );

            callback?.({ text: responseText, content: result });
            return true;
        } catch (error) {
            return handleError(error, "GET_MARKET_INFO", callback);
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