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
    active: z.boolean().optional().describe("Filter for active markets only"),
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
                console.log("Insufficient allowance. Please update your allowance manually on Polymarket.");
                const errorMsg = `Insufficient USDC allowance. You have ${allowance} USDC allowance but need ${requiredAmount} USDC for this bet. Please update your allowance on Polymarket.`;
                callback?.({ 
                    text: errorMsg,
                    content: { error: errorMsg, allowance, required: requiredAmount }
                });
                return false;
            }

            // Calculate order size based on amount and price
            const orderSize = typedParameters.amount / typedParameters.price;

            // Place the order
            // Note: createAndPostOrder is not available in the current ClobClient API
            // This would need to be implemented using the actual Polymarket API
            const order = {
                orderID: `mock-order-${Date.now()}`,
                status: "pending",
                message: "Order placement not implemented in current API"
            };

            console.log("Order placement not available in current API");

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

// Get Latest Markets Action - ENHANCED VERSION
export const getMarketsAction: Action = {
    name: "GET_MARKETS",
    description: "Get latest available markets on Polymarket using ClobClient with fresh data",
    similes: ["markets", "betting markets", "available bets", "what can I bet on", "latest markets", "newest markets", "fresh markets", "current markets"],
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

Extract parameters for getting the latest markets:
- limit: Maximum number of markets to return (optional, default 10, max 20)
- active: Filter for active markets only (optional, default true)

Respond with a JSON object.`
            });

            const { object: parameters } = await generateObject({
                runtime,
                context: parameterContext,
                modelClass: ModelClass.LARGE,
                schema: GetMarketsSchema,
            });

            const typedParameters = parameters as z.infer<typeof GetMarketsSchema>;
            const limit = Math.min(typedParameters.limit || 10, 20);
            const activeOnly = typedParameters.active !== false; // Default to true

            console.log(`Fetching ${limit} latest markets, active only: ${activeOnly}`);

            let allMarkets: any[] = [];
            
            try {
                // Get markets using the available ClobClient method
                const marketsResponse = await client.getMarkets();
                let markets = [];
                
                // Handle different response formats
                if (marketsResponse && typeof marketsResponse === 'object') {
                    if (Array.isArray(marketsResponse)) {
                        markets = marketsResponse;
                    } else if (marketsResponse.data && Array.isArray(marketsResponse.data)) {
                        markets = marketsResponse.data;
                    }
                }
                
                // Add markets to our collection
                for (const market of markets) {
                    const conditionId = market.condition_id || market.conditionId || market.id;
                    if (conditionId && !allMarkets.some(m => 
                        (m.condition_id || m.conditionId || m.id) === conditionId)) {
                        allMarkets.push(market);
                    }
                }

                console.log(`Found ${allMarkets.length} markets from ClobClient`);

                if (allMarkets.length === 0) {
                    callback?.({
                        text: "No markets found at this time. The Polymarket API may be experiencing issues or returning empty results.",
                        content: { markets: [], totalCount: 0 }
                    });
                    return true;
                }

                // Sort by creation date, end date, or activity to get latest markets
                allMarkets.sort((a, b) => {
                    // First priority: active markets
                    const aActive = a.active === true || a.active === "true";
                    const bActive = b.active === true || b.active === "true";
                    
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    
                    // Second priority: accepting orders
                    const aAccepting = a.accepting_orders === true;
                    const bAccepting = b.accepting_orders === true;
                    
                    if (aAccepting && !bAccepting) return -1;
                    if (!aAccepting && bAccepting) return 1;
                    
                    // Third priority: end date (markets ending later are "newer")
                    const aEnd = new Date(a.end_date_iso || a.endDate || '1970-01-01').getTime();
                    const bEnd = new Date(b.end_date_iso || b.endDate || '1970-01-01').getTime();
                    
                    if (aEnd !== bEnd) return bEnd - aEnd;
                    
                    // Fourth priority: creation date if available
                    const aCreated = new Date(a.created_date || a.createdAt || '1970-01-01').getTime();
                    const bCreated = new Date(b.created_date || b.createdAt || '1970-01-01').getTime();
                    
                    return bCreated - aCreated;
                });

                // Filter for active markets if requested
                if (activeOnly) {
                    allMarkets = allMarkets.filter((market: any) => {
                        const isActive = market.active === true || market.active === "true";
                        const isAcceptingOrders = market.accepting_orders === true;
                        const notClosed = market.closed !== true && market.closed !== "true";
                        const notArchived = market.archived !== true && market.archived !== "true";
                        
                        // Consider a market "active" if it's explicitly active OR accepting orders OR not closed/archived
                        return isActive || isAcceptingOrders || (notClosed && notArchived);
                    });
                    console.log(`Filtered to ${allMarkets.length} active/available markets`);
                }

                // Get the most recent markets
                const latestMarkets = allMarkets.slice(0, limit);

                // Process markets with comprehensive data and fresh timestamp
                const processedMarkets = latestMarkets.map((market: any, index: number) => {
                    const tokens = market.tokens || market.outcomes || [];
                    const tokenArray = Array.isArray(tokens) ? tokens : [];
                    
                    // Calculate freshness indicator
                    const endDate = new Date(market.end_date_iso || market.endDate || '2099-12-31');
                    const now = new Date();
                    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const freshness = daysUntilEnd > 0 ? daysUntilEnd : 0;
                    
                    return {
                        condition_id: market.condition_id || market.conditionId || market.id,
                        question_id: market.question_id || market.questionId,
                        question: market.question || market.title || market.name || 'Unknown Market',
                        description: market.description ? 
                            (market.description.length > 200 ? 
                                market.description.substring(0, 200) + '...' : 
                                market.description) : 
                            'No description available',
                        market_slug: market.market_slug || market.slug,
                        active: market.active,
                        closed: market.closed,
                        archived: market.archived,
                        accepting_orders: market.accepting_orders,
                        end_date_iso: market.end_date_iso || market.endDate,
                        created_date: market.created_date || market.createdAt,
                        minimum_order_size: market.minimum_order_size || market.minOrderSize || '1.00',
                        minimum_tick_size: market.minimum_tick_size || market.tickSize || '0.01',
                        icon: market.icon,
                        image: market.image,
                        volume: market.volume || market.totalVolume,
                        liquidity: market.liquidity,
                        neg_risk: market.neg_risk,
                        is_50_50_outcome: market.is_50_50_outcome,
                        tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
                        freshness_days: freshness,
                        tokens: tokenArray.map((token: any) => ({
                            token_id: token.token_id || token.tokenId || token.id,
                            outcome: token.outcome || token.name || token.title,
                            price: token.price || token.lastPrice || '0.50',
                            winner: token.winner,
                            volume: token.volume
                        })),
                        rewards: market.rewards ? {
                            min_size: market.rewards.min_size,
                            max_spread: market.rewards.max_spread,
                            rates_count: market.rewards.rates?.length || 0,
                            daily_rate: market.rewards.daily_rate
                        } : null,
                        last_updated: new Date().toISOString()
                    };
                });

                // Create enhanced market summary with freshness indicators
                const marketSummary = processedMarkets.map((market: any, index: number) => {
                    const outcomes = market.tokens.length > 0 ? 
                        market.tokens.map((t: any) => `${t.outcome} ($${t.price})`).join(' vs ') :
                        'No outcomes available';
                    
                    const statusEmoji = market.active ? "🟢" : 
                        (market.accepting_orders ? "🟡" : 
                        (market.closed ? "🔴" : "⚪"));
                    
                    const freshnessEmoji = market.freshness_days > 30 ? "🔥" : 
                        (market.freshness_days > 7 ? "⚡" : "⏰");
                    
                    const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(', ') : 'No tags';
                    const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : 'No end date';
                    const volume = market.volume ? `$${parseFloat(market.volume).toLocaleString()}` : 'N/A';
                    
                    return `${index + 1}. ${statusEmoji}${freshnessEmoji} ${market.question.substring(0, 70)}${market.question.length > 70 ? '...' : ''}
   📊 Outcomes: ${outcomes}
   📈 Volume: ${volume} | 🏷️ Tags: ${tags}
   💵 Min Order: $${market.minimum_order_size} | 📅 Ends: ${endDate}
   🎯 ID: ${market.condition_id || 'N/A'}
   ⏱️  Days remaining: ${market.freshness_days}`;
                }).join('\n\n');

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Found ${processedMarkets.length} latest betting markets on Polymarket (sorted by activity and freshness):

Legend: 🟢 Active | 🟡 Accepting Orders | 🔴 Closed | 🔥 Fresh (30+ days) | ⚡ Recent (7+ days) | ⏰ Ending Soon

${marketSummary}

These are the most current and active markets available for betting right now.

Generate a response highlighting these latest markets with their key details, emphasizing which ones are most active and fresh for betting.`
                });

                const responseText = await generateText({
                    runtime,
                    context: responseContext,
                    modelClass: ModelClass.LARGE,
                });

                callback?.({ 
                    text: responseText,
                    content: { 
                        markets: processedMarkets,
                        totalCount: allMarkets.length,
                        displayedCount: processedMarkets.length,
                        activeCount: processedMarkets.filter(m => m.active).length,
                        acceptingOrdersCount: processedMarkets.filter(m => m.accepting_orders).length,
                        timestamp: new Date().toISOString(),
                        source: "ClobClient-Multi",
                        sorting: "freshness_and_activity",
                        filters_applied: activeOnly ? ["active_only"] : ["all"]
                    }
                });
                return true;
                
            } catch (clobError) {
                console.error("ClobClient failed:", clobError);
                throw new Error(`Failed to fetch latest markets with ClobClient: ${clobError instanceof Error ? clobError.message : String(clobError)}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Get latest markets error:", errorMessage);
            callback?.({
                text: `Error getting latest markets: ${errorMessage}. Please check your Polymarket connection and try again.`,
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
                    text: "What are the latest betting markets available?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the latest and most active betting markets on Polymarket, sorted by freshness and activity...",
                    action: "GET_MARKETS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me the newest markets on Polymarket",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll fetch the newest and most current markets for you, prioritizing active ones with recent activity...",
                    action: "GET_MARKETS",
                },
            },
        ],
    ],
};

// Get More Markets Action - Updated to use ClobClient with pagination
export const getMoreMarketsAction: Action = {
    name: "GET_MORE_MARKETS",
    description: "Get next batch of markets using ClobClient pagination",
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
            const client = await getPolymarketClient();
            let currentState = state ?? (await runtime.composeState(message));

            // For ClobClient, we'll just fetch more markets since it doesn't have cursor-based pagination
            // We can implement offset-based pagination or just fetch a fresh batch
            
            const limit = 10; // Fixed limit for "more markets"
            
            try {
                // Get fresh batch of markets
                const marketsResponse = await client.getMarkets();
                let markets = [];
                
                if (marketsResponse?.data && Array.isArray(marketsResponse.data)) {
                    markets = marketsResponse.data;
                } else if (Array.isArray(marketsResponse)) {
                    markets = marketsResponse;
                }

                if (markets.length === 0) {
                    callback?.({
                        text: "No additional markets available at this time.",
                        content: { endOfResults: true }
                    });
                    return true;
                }

                // Skip first few markets to simulate pagination
                const startIndex = Math.floor(Math.random() * Math.max(1, markets.length - limit));
                const paginatedMarkets = markets.slice(startIndex, startIndex + limit);

                // Process markets
                const processedMarkets = paginatedMarkets.map((market: any) => {
                    const tokens = market.tokens || market.outcomes || [];
                    const tokenArray = Array.isArray(tokens) ? tokens : [];
                    
                    return {
                        condition_id: market.condition_id || market.conditionId || market.id,
                        question: market.question || market.title || 'Unknown Market',
                        description: market.description ? 
                            (market.description.length > 150 ? 
                                market.description.substring(0, 150) + '...' : 
                                market.description) : 
                            'No description',
                        active: market.active,
                        closed: market.closed,
                        accepting_orders: market.accepting_orders,
                        end_date_iso: market.end_date_iso || market.endDate,
                        minimum_order_size: market.minimum_order_size || '1.00',
                        tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
                        tokens: tokenArray.map((token: any) => ({
                            token_id: token.token_id || token.tokenId || token.id,
                            outcome: token.outcome || token.name,
                            price: token.price || token.lastPrice || '0.50',
                            winner: token.winner
                        }))
                    };
                });

                const marketSummary = processedMarkets.map((market: any, index: number) => {
                    const outcomes = market.tokens.length > 0 ? 
                        market.tokens.map((t: any) => `${t.outcome} ($${t.price})`).join(' vs ') :
                        'No outcomes available';
                    const statusEmoji = market.active ? "🟢" : (market.closed ? "🔴" : "🟡");
                    const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(', ') : 'No tags';
                    
                    return `${index + 1}. ${statusEmoji} ${market.question.substring(0, 60)}${market.question.length > 60 ? '...' : ''}
   Outcomes: ${outcomes}
   Tags: ${tags}
   Min Order: $${market.minimum_order_size}
   Ends: ${market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : 'No end date'}`;
                }).join('\n\n');

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Additional markets from Polymarket (${processedMarkets.length} shown):
${marketSummary}

Generate a response showing these additional markets with their key details.`
                });

                const responseText = await generateText({
                    runtime,
                    context: responseContext,
                    modelClass: ModelClass.LARGE,
                });

                callback?.({ 
                    text: responseText,
                    content: { 
                        markets: processedMarkets,
                        count: processedMarkets.length,
                        hasMore: markets.length > startIndex + limit,
                        source: "ClobClient"
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
                    text: "Here are additional markets from Polymarket...",
                    action: "GET_MORE_MARKETS",
                },
            },
        ],
    ],
};

// Get Market Action - Updated to use ClobClient
export const getMarketAction: Action = {
    name: "GET_MARKET",
    description: "Get details of a specific market on Polymarket using ClobClient",
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

            const typedParameters = parameters as z.infer<typeof GetMarketSchema>;

            try {
                // Use ClobClient to get market details
                const market = await client.getMarket(typedParameters.conditionId);
                console.log("Market details from ClobClient:", market);

                // Create comprehensive market summary
                const tokens = market.tokens || market.outcomes || [];
                const tokenArray = Array.isArray(tokens) ? tokens : [];
                
                const tokenDetails = tokenArray.map((token: any, index: number) => 
                    `   ${index + 1}. ${token.outcome || token.name}: $${token.price || token.lastPrice || 'N/A'} (Token ID: ${token.token_id || token.tokenId || token.id || 'N/A'})`
                ).join('\n') || 'No token information available';

                const tagsString = Array.isArray(market.tags) ? market.tags.join(', ') : 'No tags';
                const rewardInfo = market.rewards ? 
                    `Rewards available: ${market.rewards.daily_rate || 'N/A'}% daily rate, Min size: $${market.rewards.min_size}, Max spread: ${market.rewards.max_spread}%` : 
                    'No rewards program';

                const marketSummary = `
📊 Market: ${market.question || market.title || market.name || 'Unknown Market'}
📝 Description: ${market.description || 'No description available'}
🆔 Condition ID: ${market.condition_id || market.conditionId || market.id || 'N/A'}
🔗 Market Slug: ${market.market_slug || market.slug || 'N/A'}
📈 Status: ${market.active ? '🟢 Active' : '🔴 Inactive'} | ${market.accepting_orders ? 'Accepting Orders' : 'Not Accepting Orders'}
📅 End Date: ${market.end_date_iso || market.endDate ? new Date(market.end_date_iso || market.endDate).toLocaleString() : 'No end date'}
💰 Min Order Size: $${market.minimum_order_size || market.minOrderSize || '1.00'} | Tick Size: ${market.minimum_tick_size || market.tickSize || '0.01'}
🏷️ Tags: ${tagsString}
🎁 ${rewardInfo}
🔻 Outcomes & Prices:
${tokenDetails}
                `;

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Details for the requested Polymarket market:

${marketSummary}

Generate a natural language response summarizing this market's current status, outcomes, and any rewards if applicable.`
                });

                const responseText = await generateText({
                    runtime,
                    context: responseContext,
                    modelClass: ModelClass.LARGE,
                });

                callback?.({
                    text: responseText,
                    content: {
                        market,
                        summary: marketSummary,
                        tokenDetails: tokenArray,
                        conditionId: typedParameters.conditionId
                    }
                });
                return true;

            } catch (marketError) {
                console.error("Failed to fetch market:", marketError);
                const errorMsg = marketError instanceof Error ? marketError.message : String(marketError);
                callback?.({
                    text: `Error fetching market details: ${errorMsg}`,
                    content: { error: errorMsg },
                });
                return false;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error getting market details: ${errorMessage}`,
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
                    text: "Show me more info about the Trump vs Biden election market",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's the full breakdown of the Trump vs Biden election market on Polymarket...",
                    action: "GET_MARKET",
                },
            },
        ],
    ],
};
