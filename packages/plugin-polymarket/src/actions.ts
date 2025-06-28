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
import { ClobClient, OrderType, Side, AssetType } from "@polymarket/clob-client";
import { getPolymarketClient } from "./provider";
import { z } from "zod";

// Schema definitions for action parameters
const PlaceBetSchema = z.object({
    tokenId: z.string().describe("The token ID of the market outcome"),
    side: z.enum(["BUY", "SELL"]).describe("Whether to buy or sell the outcome"),
    amount: z.number().positive().describe("Amount of USDC to bet"),
    price: z.number().min(0.01).max(0.99).describe("Price per share (0.01 to 0.99)"),
});

const CheckBalanceSchema = z.object({});

const GetMarketsSchema = z.object({
    limit: z.number().optional().describe("Maximum number of markets to return"),
});

const GetMarketSchema = z.object({
    conditionId: z.string().describe("The condition ID of the market"),
});

const GetMoreMarketsSchema = z.object({
    cursor: z.string().describe("The cursor for pagination to get next batch of markets"),
    limit: z.number().optional().describe("Maximum number of markets to return"),
});

const CancelOrderSchema = z.object({
    orderId: z.string().describe("The ID of the order to cancel"),
});

// Place Bet Action
export const placeBetAction: Action = {
    name: "PLACE_BET",
    description: "Place a bet on a Polymarket outcome",
    similes: ["bet", "wager", "place order", "buy shares", "sell shares"],
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = await getPolymarketClient();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);

            const parameterContext = composeContext({
                state: currentState,
                template: `{{recentMessages}}

Extract the following information for placing a bet:
- tokenId: The token ID of the market outcome
- side: Whether to BUY or SELL
- amount: Amount of USDC to bet
- price: Price per share (between 0.01 and 0.99)

Respond with a JSON object containing these parameters.`
            });

            const { object: parameters } = await generateObject({
                runtime,
                context: parameterContext,
                modelClass: ModelClass.LARGE,
                schema: PlaceBetSchema,
            });

            // Type the parameters properly
            const typedParameters = parameters as z.infer<typeof PlaceBetSchema>;

            // Check balance and allowance first
            const balanceAllowance = await client.getBalanceAllowance({
                asset_type: AssetType.COLLATERAL
            });

            const balance = parseFloat(balanceAllowance.balance);
            const allowance = parseFloat(balanceAllowance.allowance);
            const requiredAmount = typedParameters.amount;

            if (balance < requiredAmount) {
                const errorMsg = `Insufficient USDC balance. You have ${balance} USDC but need ${requiredAmount} USDC for this bet.`;
                callback?.({ 
                    text: errorMsg,
                    content: { error: errorMsg, balance, required: requiredAmount }
                });
                return false;
            }

            // Update allowance if needed
            if (allowance < requiredAmount) {
                console.log("Updating USDC allowance...");
                await client.updateBalanceAllowance({
                    asset_type: AssetType.COLLATERAL
                });
            }

            // Calculate order size based on amount and price
            const orderSize = typedParameters.amount / typedParameters.price;

            // Place the order
            const order = await client.createAndPostOrder(
                {
                    tokenID: typedParameters.tokenId,
                    price: typedParameters.price,
                    side: typedParameters.side === "BUY" ? Side.BUY : Side.SELL,
                    size: orderSize,
                    feeRateBps: 0,
                },
                { tickSize: "0.01", negRisk: false },
                OrderType.GTC
            );

            const responseContext = composeContext({
                state: currentState,
                template: `{{recentMessages}}

A bet was placed successfully on Polymarket:
- Side: ${typedParameters.side}
- Amount: ${typedParameters.amount} USDC
- Price: ${typedParameters.price} per share
- Shares: ${orderSize}
- Order ID: ${order.orderID}

Generate a natural response confirming the bet placement.`
            });

            const response = await generateText({
                runtime,
                context: responseContext,
                modelClass: ModelClass.LARGE,
            });

            callback?.({ 
                text: response,
                content: {
                    success: true,
                    order,
                    parameters: typedParameters,
                    orderSize
                }
            });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error placing bet: ${errorMessage}`,
                content: { error: errorMessage },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to bet $10 on Trump winning at 65 cents per share",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll place a $10 bet on Trump winning at $0.65 per share. This will buy approximately 15.38 shares.",
                    action: "PLACE_BET",
                },
            },
        ],
    ],
};

// Get More Markets Action - For Pagination
export const getMoreMarketsAction: Action = {
    name: "GET_MORE_MARKETS",
    description: "Get next batch of markets using pagination cursor",
    similes: ["more markets", "next page", "continue", "see more"],
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            let currentState = state ?? (await runtime.composeState(message));

            const parameterContext = composeContext({
                state: currentState,
                template: `{{recentMessages}}

Extract the cursor from the previous markets request to get the next batch.
- cursor: The pagination cursor (required)
- limit: Maximum number of markets to return (optional, default 5)

Respond with a JSON object.`
            });

            const { object: parameters } = await generateObject({
                runtime,
                context: parameterContext,
                modelClass: ModelClass.LARGE,
                schema: GetMoreMarketsSchema,
            });

            const typedParameters = parameters as z.infer<typeof GetMoreMarketsSchema>;
            const displayLimit = Math.min(typedParameters.limit || 5, 8);

            // Check if cursor indicates end of results
            if (typedParameters.cursor === 'LTE=' || !typedParameters.cursor) {
                callback?.({
                    text: "No more markets available. You've reached the end of the results.",
                    content: { endOfResults: true }
                });
                return true;
            }

            try {
                const url = `https://clob.polymarket.com/markets?limit=${displayLimit}&next_cursor=${encodeURIComponent(typedParameters.cursor)}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                let markets = data.data || [];
                const totalCount = data.count || 0;
                const nextCursor = data.next_cursor;

                // Process markets efficiently
                const essentialMarkets = markets.map((market: any) => ({
                    condition_id: market.condition_id,
                    question: market.question || 'Unknown Market',
                    description: market.description?.substring(0, 100) + (market.description?.length > 100 ? '...' : '') || 'No description',
                    active: market.active,
                    tokens: market.tokens?.map((token: any) => ({
                        token_id: token.token_id,
                        outcome: token.outcome
                    })) || []
                }));

                const marketSummary = essentialMarkets.map((market: any, index: number) => {
                    const outcomes = market.tokens.map((t: any) => t.outcome).join(' vs ');
                    return `${index + 1}. ${market.question.substring(0, 80)}${market.question.length > 80 ? '...' : ''} (${outcomes})`;
                }).join('\n');

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Next batch of markets:
${marketSummary}

Generate a response showing these additional markets.`
                });

                const responseText = await generateText({
                    runtime,
                    context: responseContext,
                    modelClass: ModelClass.LARGE,
                });

                callback?.({ 
                    text: responseText,
                    content: { 
                        markets: essentialMarkets,
                        hasMore: nextCursor && nextCursor !== 'LTE=',
                        nextCursor
                    }
                });
                return true;
                
            } catch (error) {
                console.error("Failed to fetch more markets:", error);
                throw new Error(`Failed to get more markets: ${error instanceof Error ? error.message : String(error)}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error getting more markets: ${errorMessage}`,
                content: { error: errorMessage },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me more markets",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are more markets from Polymarket...",
                    action: "GET_MORE_MARKETS",
                },
            },
        ],
    ],
};

// Check Balance Action
export const checkBalanceAction: Action = {
    name: "CHECK_BALANCE",
    description: "Check USDC balance and allowance on Polymarket",
    similes: ["balance", "funds", "money", "usdc", "check wallet"],
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = await getPolymarketClient();
            let currentState = state ?? (await runtime.composeState(message));

            const balanceAllowance = await client.getBalanceAllowance({
                asset_type: AssetType.COLLATERAL
            });

            const responseContext = composeContext({
                state: currentState,
                template: `{{recentMessages}}

Polymarket wallet balance information:
- USDC Balance: ${balanceAllowance.balance}
- USDC Allowance: ${balanceAllowance.allowance}

Generate a natural response with the balance information.`
            });

            const response = await generateText({
                runtime,
                context: responseContext,
                modelClass: ModelClass.LARGE,
            });

            callback?.({ 
                text: response,
                content: {
                    balance: balanceAllowance.balance,
                    allowance: balanceAllowance.allowance
                }
            });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error checking balance: ${errorMessage}`,
                content: { error: errorMessage },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's my balance?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Your current USDC balance on Polymarket is $25.50 with an allowance of $100.00",
                    action: "CHECK_BALANCE",
                },
            },
        ],
    ],
};

// Get Markets Action - OPTIMIZED FOR TOKEN EFFICIENCY
export const getMarketsAction: Action = {
    name: "GET_MARKETS",
    description: "Get available markets on Polymarket",
    similes: ["markets", "betting markets", "available bets", "what can I bet on"],
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            let currentState = state ?? (await runtime.composeState(message));

            const parameterContext = composeContext({
                state: currentState,
                template: `{{recentMessages}}

Extract parameters for getting markets:
- limit: Maximum number of markets to return (optional, default 5, max 10)

Respond with a JSON object.`
            });

            const { object: parameters } = await generateObject({
                runtime,
                context: parameterContext,
                modelClass: ModelClass.LARGE,
                schema: GetMarketsSchema,
            });

            // Type the parameters properly
            const typedParameters = parameters as z.infer<typeof GetMarketsSchema>;

            // Cap the limit to prevent token overflow - conservative limit
            const requestLimit = Math.min(typedParameters.limit || 5, 20); // Request more to have options
            const displayLimit = Math.min(typedParameters.limit || 5, 8);  // But only display fewer
            
            try {
                // Strategy 1: Use API limit parameter (not cursor) to cap initial data
                const url = `https://clob.polymarket.com/markets?limit=${requestLimit}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                let markets = data.data || [];
                const totalCount = data.count || markets.length;
                const nextCursor = data.next_cursor;

                // Strategy 2: Filter out essential fields only to reduce token usage
                const essentialMarkets = markets.slice(0, displayLimit).map((market: any) => ({
                    condition_id: market.condition_id,
                    question: market.question || 'Unknown Market',
                    description: market.description?.substring(0, 100) + (market.description?.length > 100 ? '...' : '') || 'No description',
                    active: market.active,
                    end_date_iso: market.end_date_iso,
                    tokens: market.tokens?.map((token: any) => ({
                        token_id: token.token_id,
                        outcome: token.outcome
                    })) || []
                }));

                // Strategy 3: Create ultra-concise summary for context
                const marketSummary = essentialMarkets.map((market: any, index: number) => {
                    const outcomes = market.tokens.map((t: any) => t.outcome).join(' vs ');
                    return `${index + 1}. ${market.question.substring(0, 80)}${market.question.length > 80 ? '...' : ''} (${outcomes})`;
                }).join('\n');

                // Strategy 4: Keep response context minimal
                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Found ${displayLimit} markets (${totalCount} total available):
${marketSummary}

Generate a concise response listing the markets. Keep it brief.`
                });

                const responseText = await generateText({
                    runtime,
                    context: responseContext,
                    modelClass: ModelClass.LARGE,
                });

                // Strategy 5: Return minimal essential data in content
                callback?.({ 
                    text: responseText,
                    content: { 
                        markets: essentialMarkets, // Only essential fields
                        totalCount,
                        displayLimit,
                        hasMore: nextCursor && nextCursor !== 'LTE=', // Check if more pages available
                        nextCursor: nextCursor // Store for potential pagination
                    }
                });
                return true;
                
            } catch (error) {
                console.error("Failed to fetch markets directly:", error);
                throw new Error(`Failed to get markets: ${error instanceof Error ? error.message : String(error)}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error getting markets: ${errorMessage}`,
                content: { error: errorMessage },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What markets are available for betting?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the current betting markets available on Polymarket...",
                    action: "GET_MARKETS",
                },
            },
        ],
    ],
};

// Get Market Action
export const getMarketAction: Action = {
    name: "GET_MARKET",
    description: "Get details of a specific market on Polymarket",
    similes: ["market details", "specific market", "market info"],
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = await getPolymarketClient();
            let currentState = state ?? (await runtime.composeState(message));

            const parameterContext = composeContext({
                state: currentState,
                template: `{{recentMessages}}

Extract the condition ID for the market to get details for.

Respond with a JSON object containing the conditionId.`
            });

            const { object: parameters } = await generateObject({
                runtime,
                context: parameterContext,
                modelClass: ModelClass.LARGE,
                schema: GetMarketSchema,
            });

            // Type the parameters properly
            const typedParameters = parameters as z.infer<typeof GetMarketSchema>;

            const market = await client.getMarket(typedParameters.conditionId);

            // Create a concise summary instead of sending full JSON
            const marketSummary = `
Market: ${market.question || market.title || 'Unknown Market'}
Description: ${market.description || 'No description'}
Status: ${market.status || 'Unknown'}
Outcomes: ${market.outcomes ? market.outcomes.length : 0} available
`;

            const responseContext = composeContext({
                state: currentState,
                template: `{{recentMessages}}

Market details:
${marketSummary}

Generate a natural response with the market details.`
            });

            const response = await generateText({
                runtime,
                context: responseContext,
                modelClass: ModelClass.LARGE,
            });

            callback?.({ 
                text: response,
                content: { market }
            });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error getting market: ${errorMessage}`,
                content: { error: errorMessage },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me about the Trump election market",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the details for that market...",
                    action: "GET_MARKET",
                },
            },
        ],
    ],
};

export const polymarketActions: Action[] = [
    placeBetAction,
    checkBalanceAction,
    getMarketsAction,
    getMoreMarketsAction,
    getMarketAction,
];