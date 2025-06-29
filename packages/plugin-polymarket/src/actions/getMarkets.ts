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

export const getMarketsAction: Action = {
    name: "GET_MARKETS",
    similes: ["LIST_MARKETS", "SHOW_MARKETS", "BROWSE_MARKETS", "MARKET_LIST", "AVAILABLE_MARKETS", "MARKET_CATALOG"],
    description: "Get a list of available prediction markets with filtering and pagination options",
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

Extract market listing parameters from the conversation. Look for:
- Market type or category (politics, sports, crypto, etc.)
- Number of markets to show (limit)
- Cursor for pagination
- Specific keywords or search terms
- Active/inactive status preference

If no specific parameters are mentioned, use defaults for a general market listing.`
            });

            const { object: params } = await generateObject({
                runtime,
                context: marketContext,
                modelClass: ModelClass.LARGE,
                schema: {
                    type: "object",
                    properties: {
                        marketType: { 
                            type: "string", 
                            description: "Type of markets to filter by (politics, sports, crypto, etc.)",
                            enum: ["all", "politics", "sports", "crypto", "entertainment", "business", "technology"]
                        },
                        limit: { 
                            type: "number", 
                            description: "Number of markets to return (default: 20)",
                            minimum: 1,
                            maximum: 100
                        },
                        cursor: { 
                            type: "string", 
                            description: "Cursor for pagination" 
                        },
                        searchTerm: {
                            type: "string",
                            description: "Search term to filter markets"
                        },
                        activeOnly: {
                            type: "boolean",
                            description: "Show only active markets"
                        }
                    },
                    required: []
                }
            });

            console.log(`📊 Getting markets with params:`, params);
            
            // Get markets with pagination
            const marketsResponse = await clobClient.getMarkets(params.cursor || undefined);
            
            // Filter markets based on parameters
            let filteredMarkets = marketsResponse.data;
            
            if (params.searchTerm) {
                filteredMarkets = filteredMarkets.filter((market: any) => 
                    market.question?.toLowerCase().includes(params.searchTerm.toLowerCase()) ||
                    market.description?.toLowerCase().includes(params.searchTerm.toLowerCase())
                );
            }
            
            if (params.activeOnly) {
                filteredMarkets = filteredMarkets.filter((market: any) => market.active !== false);
            }
            
            if (params.marketType && params.marketType !== 'all') {
                filteredMarkets = filteredMarkets.filter((market: any) => 
                    market.category?.toLowerCase().includes(params.marketType.toLowerCase())
                );
            }
            
            // Apply limit
            if (params.limit) {
                filteredMarkets = filteredMarkets.slice(0, params.limit);
            }

            const result = {
                markets: filteredMarkets,
                pagination: {
                    limit: marketsResponse.limit,
                    count: marketsResponse.count,
                    nextCursor: marketsResponse.next_cursor,
                    hasMore: marketsResponse.next_cursor !== null
                },
                filters: params
            };

            const responseText = await generateResponse(
                runtime,
                currentState,
                "GET_MARKETS",
                result,
                `📈 Successfully retrieved ${filteredMarkets.length} markets`
            );

            callback?.({ text: responseText, content: result });
            return true;
        } catch (error) {
            return handleError(error, "GET_MARKETS", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Show me the latest prediction markets" }
            },
            {
                user: "{{user2}}",
                content: { text: "Here are the latest prediction markets available..." }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "List all active crypto markets" }
            },
            {
                user: "{{user2}}",
                content: { text: "Here are all the active cryptocurrency prediction markets..." }
            }
        ]
    ]
}; 