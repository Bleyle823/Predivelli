import {
    type Action,
    generateText,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    generateObject,
} from "@elizaos/core";
import { getPolymarketService } from "./provider";

/**
 * Get all Polymarket actions using CLOB client
 */
export async function getPolymarketActions(): Promise<Action[]> {
    const actions: Action[] = [
        {
            name: "GET_POLYMARKET_MARKETS",
            similes: ["LIST_MARKETS", "SHOW_MARKETS", "VIEW_MARKETS", "GET_EVENTS", "BROWSE_MARKETS"],
            description: "Get Polymarket markets and events with optional filtering",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const marketsContext = composeContext({
                        state: currentState,
                        template: `{{recentMessages}}

Extract market search criteria from the recent messages. Look for:
- Keywords to search for in market questions
- Active/inactive status preference
- Number of markets requested (limit)
- Any specific market categories or topics
If no specific criteria is mentioned, get active markets with a reasonable limit.`
                    });

                    const { object: params } = await generateObject({
                        runtime,
                        context: marketsContext,
                        modelClass: ModelClass.LARGE,
                        schema: {
                            type: "object",
                            properties: {
                                active: { type: "boolean", description: "Filter for active markets only", default: true },
                                limit: { type: "number", description: "Number of markets to return", default: 10 },
                                searchTerm: { type: "string", description: "Search term to filter markets by question content" }
                            }
                        }
                    });

                    let markets = await service.getMarkets({
                        active: params.active,
                        limit: params.limit
                    });

                    // Filter by search term if provided
                    if (params.searchTerm) {
                        const searchLower = params.searchTerm.toLowerCase();
                        markets = markets.filter(market => 
                            market.question?.toLowerCase().includes(searchLower) ||
                            market.description?.toLowerCase().includes(searchLower)
                        );
                    }

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "GET_POLYMARKET_MARKETS",
                        { markets, count: markets.length, searchTerm: params.searchTerm },
                        `Retrieved ${markets.length} Polymarket markets successfully`
                    );

                    callback?.({ text: responseText, content: { markets, count: markets.length } });
                    return true;
                } catch (error) {
                    return handleError(error, "GET_POLYMARKET_MARKETS", callback);
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Show me the latest Polymarket markets" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Here are the latest Polymarket markets..." }
                    }
                ],
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Find markets about the 2024 election" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Here are the election-related markets I found..." }
                    }
                ]
            ]
        },
        {
            name: "GET_MARKET_DETAILS",
            similes: ["MARKET_INFO", "SHOW_MARKET", "VIEW_MARKET", "MARKET_DETAILS"],
            description: "Get detailed information about a specific market",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const marketContext = composeContext({
                        state: currentState,
                        template: `{{recentMessages}}

Extract the market identifier from the recent messages. Look for:
- Condition ID (hexadecimal string)
- Market question or description
- Token address
If no specific market is mentioned, ask the user to provide more details.`
                    });

                    const { object: params } = await generateObject({
                        runtime,
                        context: marketContext,
                        modelClass: ModelClass.LARGE,
                        schema: {
                            type: "object",
                            properties: {
                                conditionId: { type: "string", description: "Market condition ID" },
                                searchQuery: { type: "string", description: "Search query to find market by question" }
                            }
                        }
                    });

                    let market;
                    
                    if (params.conditionId) {
                        market = await service.getMarket(params.conditionId);
                    } else if (params.searchQuery) {
                        // Search for markets matching query
                        const markets = await service.getMarkets({ limit: 50 });
                        const searchLower = params.searchQuery.toLowerCase();
                        const foundMarket = markets.find(m => 
                            m.question?.toLowerCase().includes(searchLower) ||
                            m.description?.toLowerCase().includes(searchLower)
                        );
                        
                        if (foundMarket) {
                            market = await service.getMarket(foundMarket.condition_id);
                        } else {
                            throw new Error(`No market found matching: ${params.searchQuery}`);
                        }
                    } else {
                        throw new Error("Please provide a market condition ID or search query");
                    }

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "GET_MARKET_DETAILS",
                        market,
                        "Retrieved market details successfully"
                    );

                    callback?.({ text: responseText, content: market });
                    return true;
                } catch (error) {
                    return handleError(error, "GET_MARKET_DETAILS", callback);
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Get details for market condition ID 0x123..." }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Here are the market details..." }
                    }
                ]
            ]
        },
        {
            name: "CREATE_POLYMARKET_ORDER",
            similes: ["PLACE_ORDER", "BUY_TOKENS", "SELL_TOKENS", "TRADE", "BET"],
            description: "Create a buy or sell order on Polymarket",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    if (!service.isWalletConnected()) {
                        throw new Error("Wallet not configured. Please set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL environment variables.");
                    }
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const orderContext = composeContext({
                        state: currentState,
                        template: `{{recentMessages}}

Extract order parameters from the recent messages. Look for:
- Token ID for the market position
- Order side (BUY or SELL)
- Amount/size to trade
- Price per token (between 0.01 and 0.99)
- Market question or condition ID to identify the market`
                    });

                    const { object: params } = await generateObject({
                        runtime,
                        context: orderContext,
                        modelClass: ModelClass.LARGE,
                        schema: {
                            type: "object",
                            properties: {
                                tokenId: { type: "string", description: "Token ID for the market position" },
                                side: { type: "string", enum: ["BUY", "SELL"], description: "Order side" },
                                size: { type: "string", description: "Amount to trade (in shares)" },
                                price: { type: "string", description: "Price per token (0.01 to 0.99)" },
                                marketQuery: { type: "string", description: "Market search query if token ID not provided" }
                            }
                        }
                    });

                    // Validate required parameters
                    if (!params.tokenId && !params.marketQuery) {
                        throw new Error("Please provide either a token ID or market search query");
                    }
                    
                    if (!params.side || !params.size || !params.price) {
                        throw new Error("Please provide order side (BUY/SELL), size, and price");
                    }

                    // Validate price range
                    const priceNum = parseFloat(params.price);
                    if (priceNum < 0.01 || priceNum > 0.99) {
                        throw new Error("Price must be between 0.01 and 0.99");
                    }

                    // If token ID not provided, search for market
                    let tokenId = params.tokenId;
                    if (!tokenId && params.marketQuery) {
                        const markets = await service.getMarkets({ limit: 50 });
                        const searchLower = params.marketQuery.toLowerCase();
                        const foundMarket = markets.find(m => 
                            m.question?.toLowerCase().includes(searchLower)
                        );
                        
                        if (foundMarket && foundMarket.tokens && foundMarket.tokens.length > 0) {
                            // Use first token (YES token typically)
                            tokenId = foundMarket.tokens[0].token_id;
                        } else {
                            throw new Error(`No market found matching: ${params.marketQuery}`);
                        }
                    }

                    const result = await service.createOrder({
                        tokenId: tokenId!,
                        price: params.price,
                        size: params.size,
                        side: params.side as 'BUY' | 'SELL'
                    });

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "CREATE_POLYMARKET_ORDER",
                        result,
                        `${params.side} order created successfully`
                    );

                    callback?.({ text: responseText, content: result });
                    return true;
                } catch (error) {
                    return handleError(error, "CREATE_POLYMARKET_ORDER", callback);
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Buy 10 YES tokens at 0.60 for the election market" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Created buy order for 10 YES tokens at 0.60..." }
                    }
                ]
            ]
        },
        {
            name: "GET_MY_ORDERS",
            similes: ["MY_ORDERS", "LIST_ORDERS", "SHOW_ORDERS", "VIEW_ORDERS"],
            description: "Get all active orders for the connected wallet",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    if (!service.isWalletConnected()) {
                        throw new Error("Wallet not configured. Please set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL environment variables.");
                    }
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const result = await service.getOrders();

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "GET_MY_ORDERS",
                        result,
                        "Retrieved your active orders successfully"
                    );

                    callback?.({ text: responseText, content: result });
                    return true;
                } catch (error) {
                    return handleError(error, "GET_MY_ORDERS", callback);
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Show me my active orders" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Here are your active orders..." }
                    }
                ]
            ]
        },
        {
            name: "CANCEL_ORDER",
            similes: ["CANCEL", "REMOVE_ORDER", "DELETE_ORDER"],
            description: "Cancel a specific order by ID",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    if (!service.isWalletConnected()) {
                        throw new Error("Wallet not configured. Please set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL environment variables.");
                    }
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const cancelContext = composeContext({
                        state: currentState,
                        template: `{{recentMessages}}

Extract the order ID to cancel from the recent messages. Look for:
- Order ID or order hash
- Specific order reference number`
                    });

                    const { object: params } = await generateObject({
                        runtime,
                        context: cancelContext,
                        modelClass: ModelClass.LARGE,
                        schema: {
                            type: "object",
                            properties: {
                                orderId: { type: "string", description: "Order ID to cancel" }
                            },
                            required: ["orderId"]
                        }
                    });

                    const result = await service.cancelOrder(params.orderId);

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "CANCEL_ORDER",
                        result,
                        "Order cancelled successfully"
                    );

                    callback?.({ text: responseText, content: result });
                    return true;
                } catch (error) {
                    return handleError(error, "CANCEL_ORDER", callback);
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Cancel order 0xabc123..." }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Order has been cancelled successfully" }
                    }
                ]
            ]
        },
        {
            name: "CANCEL_ALL_ORDERS",
            similes: ["CANCEL_ALL", "REMOVE_ALL_ORDERS", "DELETE_ALL_ORDERS"],
            description: "Cancel all active orders for the wallet",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    if (!service.isWalletConnected()) {
                        throw new Error("Wallet not configured. Please set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL environment variables.");
                    }
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const result = await service.cancelAllOrders();

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "CANCEL_ALL_ORDERS",
                        result,
                        "All orders cancelled successfully"
                    );

                    callback?.({ text: responseText, content: result });
                    return true;
                } catch (error) {
                    return handleError(error, "CANCEL_ALL_ORDERS", callback);
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
                        content: { text: "All orders have been cancelled successfully" }
                    }
                ]
            ]
        },
        {
            name: "GET_PORTFOLIO",
            similes: ["MY_PORTFOLIO", "SHOW_PORTFOLIO", "VIEW_PORTFOLIO", "HOLDINGS"],
            description: "Get portfolio information including positions and balances",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    if (!service.isWalletConnected()) {
                        throw new Error("Wallet not configured. Please set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL environment variables.");
                    }
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const [portfolio, balances] = await Promise.all([
                        service.getPortfolio(),
                        service.getBalances()
                    ]);

                    const result = { portfolio, balances };

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "GET_PORTFOLIO",
                        result,
                        "Retrieved portfolio information successfully"
                    );

                    callback?.({ text: responseText, content: result });
                    return true;
                } catch (error) {
                    return handleError(error, "GET_PORTFOLIO", callback);
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Show me my portfolio" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Here's your portfolio summary..." }
                    }
                ]
            ]
        },
        {
            name: "GET_SAMPLING_MARKETS",
            similes: ["TRENDING_MARKETS", "POPULAR_MARKETS", "SAMPLE_MARKETS"],
            description: "Get a sample of trending or popular markets",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    const service = getPolymarketService();
                    
                    let currentState = state ?? (await runtime.composeState(message));
                    currentState = await runtime.updateRecentMessageState(currentState);

                    const samplingContext = composeContext({
                        state: currentState,
                        template: `{{recentMessages}}

Extract sampling parameters from the recent messages. Look for:
- Number of markets requested
- Any specific preferences for trending/popular markets`
                    });

                    const { object: params } = await generateObject({
                        runtime,
                        context: samplingContext,
                        modelClass: ModelClass.LARGE,
                        schema: {
                            type: "object",
                            properties: {
                                limit: { type: "number", description: "Number of markets to return", default: 10 }
                            }
                        }
                    });

                    const result = await service.getSamplingMarkets(params.limit);

                    const responseText = await generateResponse(
                        runtime,
                        currentState,
                        "GET_SAMPLING_MARKETS",
                        { markets: result, count: result.length },
                        `Retrieved ${result.length} trending markets successfully`
                    );

                    callback?.({ text: responseText, content: { markets: result, count: result.length } });
                    return true;
                } catch (error) {
                    return handleError(error, "GET_SAMPLING_MARKETS", callback);
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Show me some trending markets" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "Here are some trending markets..." }
                    }
                ]
            ]
        }
    ];

    return actions;
}

async function generateResponse(
    runtime: IAgentRuntime,
    state: State,
    actionName: string,
    result: unknown,
    successMessage: string
): Promise<string> {
    const responseTemplate = `
# Action Examples
{{actionExamples}}

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

The action "${actionName}" was executed successfully.
${successMessage}

Here is the result:
${JSON.stringify(result, null, 2)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
`;

    const context = composeContext({ state, template: responseTemplate });
    
    return generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });
}

function handleError(
    error: unknown,
    actionName: string,
    callback?: HandlerCallback
): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing ${actionName}:`, error);
    
    callback?.({
        text: `Error executing ${actionName}: ${errorMessage}`,
        content: { error: errorMessage },
    });
    
    return false;
}