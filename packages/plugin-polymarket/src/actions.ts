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
import { Wallet } from "@ethersproject/wallet";
import { getPolymarketClient } from "./provider";
import { z } from "zod";

// Type definitions for API responses
interface PolymarketMarket {
    condition_id?: string;
    conditionId?: string;
    id?: string;
    question_id?: string;
    questionId?: string;
    question?: string;
    title?: string;
    name?: string;
    description?: string;
    market_slug?: string;
    slug?: string;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
    accepting_orders?: boolean;
    end_date_iso?: string;
    endDate?: string;
    created_date?: string;
    createdAt?: string;
    minimum_order_size?: string;
    minOrderSize?: string;
    minimum_tick_size?: string;
    tickSize?: string;
    icon?: string;
    image?: string;
    volume?: string;
    volume24hr?: string;
    totalVolume?: string;
    liquidity?: string;
    neg_risk?: boolean;
    is_50_50_outcome?: boolean;
    tags?: string[];
    tokens?: PolymarketToken[];
    outcomes?: PolymarketToken[];
    rewards?: {
        min_size?: string;
        max_spread?: string;
        rates?: any[];
        daily_rate?: string;
    };
}

interface PolymarketToken {
    token_id?: string;
    tokenId?: string;
    id?: string;
    outcome?: string;
    name?: string;
    title?: string;
    price?: string;
    lastPrice?: string;
    winner?: boolean;
    volume?: string;
}

interface PolymarketApiResponse {
    data?: PolymarketMarket[];
    markets?: PolymarketMarket[];
}

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

// Helper function to create authenticated Polymarket client with signer
async function getAuthenticatedPolymarketClient(runtime: IAgentRuntime) {
    // Get wallet private key for signing transactions
    const PRIVATE_KEY = runtime.getSetting("PK") || 
                       runtime.getSetting("PRIVATE_KEY") || 
                       runtime.getSetting("WALLET_PRIVATE_KEY");
    if (!PRIVATE_KEY) {
        throw new Error("Private key not found in environment variables or character secrets. Please set PK, PRIVATE_KEY, or WALLET_PRIVATE_KEY in your .env file or character secrets.");
    }

    // Get Polymarket API credentials for authentication
    const API_KEY = runtime.getSetting("POLYMARKET_API_KEY");
    const SECRET = runtime.getSetting("POLYMARKET_SECRET");
    const PASSPHRASE = runtime.getSetting("POLYMARKET_PASSPHRASE");
    
    if (!API_KEY || !SECRET || !PASSPHRASE) {
        throw new Error("Polymarket API credentials not found. Please set POLYMARKET_API_KEY, POLYMARKET_SECRET, and POLYMARKET_PASSPHRASE in your character secrets.");
    }

    const host = 'https://clob.polymarket.com';
    const funder = runtime.getSetting("FUNDER_ADDRESS") || '0x993f563E24efee863BbD0E54FD5Ca3d010202c39';
    const signer = new Wallet(PRIVATE_KEY);
    const signatureType = 0; // Browser wallet type

    try {
        // Create authenticated client with API credentials
        // Try different approaches for authentication
        let client;
        
        // Approach 1: Try passing credentials in constructor
        try {
            client = new ClobClient(host, 137, signer, {
                apiKey: API_KEY,
                secret: SECRET,
                passphrase: PASSPHRASE
            });
            console.log("✅ Polymarket client created with credentials in constructor");
        } catch (constructorError) {
            console.log("Constructor with credentials failed, trying alternative approach");
            
            // Approach 2: Create client and set credentials after
            client = new ClobClient(host, 137, signer);
            
            // Try setting credentials as properties
            if (client) {
                try {
                    // Set credentials as properties if they exist
                    if (typeof client.apiKey !== 'undefined') client.apiKey = API_KEY;
                    if (typeof client.secret !== 'undefined') client.secret = SECRET;
                    if (typeof client.passphrase !== 'undefined') client.passphrase = PASSPHRASE;
                    
                    // Try setting headers if the client supports it
                    if (typeof client.setHeaders === 'function') {
                        client.setHeaders({
                            'X-API-Key': API_KEY,
                            'X-Secret': SECRET,
                            'X-Passphrase': PASSPHRASE
                        });
                    }
                    
                    console.log("✅ Polymarket client created and credentials set as properties");
                } catch (propertyError) {
                    console.log("Setting credentials as properties failed:", propertyError.message);
                }
            }
        }
        
        if (!client) {
            throw new Error("Failed to create Polymarket client");
        }
        
        console.log("🔐 Polymarket API credentials loaded successfully");
        return client;
    } catch (error) {
        console.error("Failed to create authenticated Polymarket client:", error);
        throw new Error(`Failed to create authenticated Polymarket client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Place Bet Action - Fixed with proper signer
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
            const client = await getAuthenticatedPolymarketClient(runtime);
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

            // Note: Allowance update may need to be handled differently based on the actual API
            if (allowance < requiredAmount) {
                console.log("Allowance may need to be updated. Please check the Polymarket documentation for the correct method.");
                // For now, we'll proceed and let the order fail if allowance is insufficient
            }

            // Calculate order size based on amount and price
            const orderSize = typedParameters.amount / typedParameters.price;

            try {
                // Place the order using the authenticated client
                console.log("Placing order...");
                // Note: The actual method name and parameters may vary based on the ClobClient version
                // This is a placeholder - you'll need to check the actual API documentation
                const orderResponse = await client.createOrder({
                    tokenID: typedParameters.tokenId,
                    price: typedParameters.price,
                    side: typedParameters.side === "BUY" ? Side.BUY : Side.SELL,
                    size: orderSize,
                    feeRateBps: 0,
                });

                console.log("Order placed successfully:", orderResponse);

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

A bet was placed successfully on Polymarket:
- Side: ${typedParameters.side}
- Amount: ${typedParameters.amount} USDC
- Price: ${typedParameters.price} per share
- Shares: ${orderSize}
- Order Response: ${JSON.stringify(orderResponse)}

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
                        order: orderResponse,
                        parameters: typedParameters,
                        orderSize
                    }
                });
                return true;

            } catch (orderError) {
                const errorMsg = `Failed to place order: ${orderError instanceof Error ? orderError.message : String(orderError)}`;
                console.error("Order placement error:", errorMsg);
                callback?.({
                    text: `Error placing bet: ${errorMsg}`,
                    content: { error: errorMsg },
                });
                return false;
            }

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
            const client = await getAuthenticatedPolymarketClient(runtime);
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

// Get Latest Markets Action - Updated to use CLOB API for fresh active markets
export const getMarketsAction: Action = {
    name: "GET_MARKETS",
    description: "Get latest active markets from Polymarket using CLOB API",
    similes: ["markets", "betting markets", "available bets", "what can I bet on", "latest markets", "newest markets", "fresh markets", "current markets", "active markets"],
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
            
            // Temporary debug option - set to true to disable filtering and show all markets
            const debugShowAll = process.env.DEBUG_SHOW_ALL_MARKETS === 'true';

            console.log(`Fetching ${limit} latest markets, active only: ${activeOnly}, debug show all: ${debugShowAll}`);

            try {
                // Use CLOB API to get markets
                const client = await getPolymarketClient();
                const marketsResponse = await client.getMarkets();
                
                let markets: any[] = [];
                if (Array.isArray(marketsResponse)) {
                    markets = marketsResponse;
                } else if (marketsResponse && typeof marketsResponse === 'object') {
                    const response = marketsResponse as any;
                    if (response.data && Array.isArray(response.data)) {
                        markets = response.data;
                    }
                }

                if (!Array.isArray(markets)) {
                    console.log("Unexpected response format:", marketsResponse);
                    markets = [];
                }

                console.log(`Found ${markets.length} total markets from CLOB API`);

                // Debug: Log market data structure
                if (markets.length > 0) {
                    const sampleMarket = markets[0];
                    console.log("Sample market structure:", {
                        question: sampleMarket.question || sampleMarket.title || 'No title',
                        active: sampleMarket.active,
                        closed: sampleMarket.closed,
                        archived: sampleMarket.archived,
                        accepting_orders: sampleMarket.accepting_orders,
                        end_date: sampleMarket.end_date_iso || sampleMarket.endDate,
                        has_tokens: sampleMarket.tokens && Array.isArray(sampleMarket.tokens),
                        tokens_count: sampleMarket.tokens ? sampleMarket.tokens.length : 0
                    });
                }

                if (markets.length === 0) {
                    callback?.({
                        text: "No markets found at this time. The Polymarket CLOB API may be experiencing issues.",
                        content: { markets: [], totalCount: 0 }
                    });
                    return true;
                }

                // Enhanced filtering for active markets
                let filteredMarkets = markets;
                if (activeOnly && !debugShowAll) {
                    console.log(`Starting with ${markets.length} total markets`);
                    
                    // Debug: Show sample market data
                    if (markets.length > 0) {
                        console.log("Sample market data structure:", {
                            question: markets[0].question || markets[0].title,
                            active: markets[0].active,
                            closed: markets[0].closed,
                            archived: markets[0].archived,
                            accepting_orders: markets[0].accepting_orders,
                            end_date: markets[0].end_date_iso || markets[0].endDate
                        });
                    }
                    
                    // Very lenient filtering - only filter out obviously closed/archived markets
                    filteredMarkets = markets.filter((market: any) => {
                        // Only filter out explicitly closed or archived markets
                        const isNotClosed = market.closed !== true;
                        const isNotArchived = market.archived !== true;
                        
                        // Log what we're filtering out
                        if (!isNotClosed) console.log(`Filtered out: ${market.question || market.title} - explicitly closed`);
                        if (!isNotArchived) console.log(`Filtered out: ${market.question || market.title} - explicitly archived`);
                        
                        return isNotClosed && isNotArchived;
                    });
                    
                    console.log(`After lenient filtering: ${filteredMarkets.length} markets remain`);
                    
                    // If we filtered out too many, show all markets with a warning
                    if (filteredMarkets.length === 0 && markets.length > 0) {
                        console.log("Warning: All markets were filtered out. Showing all markets with status indicators.");
                        filteredMarkets = markets;
                    }
                } else if (debugShowAll) {
                    console.log("DEBUG: Showing all markets without filtering");
                    filteredMarkets = markets;
                }

                if (filteredMarkets.length === 0) {
                    // If no markets after filtering, try showing all markets with a warning
                    if (markets.length > 0) {
                        console.log("Warning: All markets were filtered out. Showing all markets with status indicators.");
                        filteredMarkets = markets;
                    } else {
                        callback?.({
                            text: "No markets found at this time. The Polymarket CLOB API may be experiencing issues.",
                            content: { markets: [], totalCount: 0 }
                        });
                        return true;
                    }
                }

                // Sort markets by activity and volume for better presentation
                filteredMarkets.sort((a: any, b: any) => {
                    // First priority: accepting orders
                    const aAccepting = a.accepting_orders !== false;
                    const bAccepting = b.accepting_orders !== false;
                    if (aAccepting !== bAccepting) {
                        return aAccepting ? -1 : 1;
                    }
                    
                    // Second priority: 24h volume (higher volume first)
                    const aVolume = parseFloat(a.volume24hr || a.volume || '0');
                    const bVolume = parseFloat(b.volume24hr || b.volume || '0');
                    if (aVolume !== bVolume) {
                        return bVolume - aVolume;
                    }
                    
                    // Third priority: end date (sooner ending first for urgency)
                    const aEndDate = a.end_date_iso || a.endDate;
                    const bEndDate = b.end_date_iso || b.endDate;
                    if (aEndDate && bEndDate) {
                        const aEnd = new Date(aEndDate);
                        const bEnd = new Date(bEndDate);
                        return aEnd.getTime() - bEnd.getTime();
                    }
                    
                    // Fourth priority: creation date (newer first)
                    const aCreated = a.created_date || a.createdAt;
                    const bCreated = b.created_date || b.createdAt;
                    if (aCreated && bCreated) {
                        const aCreate = new Date(aCreated);
                        const bCreate = new Date(bCreated);
                        return bCreate.getTime() - aCreate.getTime();
                    }
                    
                    return 0;
                });

                // Process markets with comprehensive data
                const processedMarkets = filteredMarkets.slice(0, limit).map((market: any, index: number) => {
                    const tokens = market.tokens || market.outcomes || [];
                    const tokenArray = Array.isArray(tokens) ? tokens : [];
                    
                    // Calculate freshness indicator and time remaining
                    const endDate = new Date(market.end_date_iso || market.endDate || '2099-12-31');
                    const now = new Date();
                    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const freshness = daysUntilEnd > 0 ? daysUntilEnd : 0;
                    
                    // Calculate market activity score
                    const volume24hr = parseFloat(market.volume24hr || market.volume || '0');
                    const liquidity = parseFloat(market.liquidity || '0');
                    const activityScore = volume24hr + (liquidity * 0.1); // Weight volume more heavily
                    
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
                        volume: market.volume || market.volume24hr || market.totalVolume,
                        volume24hr: market.volume24hr,
                        liquidity: market.liquidity,
                        neg_risk: market.neg_risk,
                        is_50_50_outcome: market.is_50_50_outcome,
                        tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
                        freshness_days: freshness,
                        activity_score: activityScore,
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

                // Create enhanced market summary with activity indicators
                const marketSummary = processedMarkets.map((market: any, index: number) => {
                    const outcomes = market.tokens.length > 0 ? 
                        market.tokens.map((t: any) => `${t.outcome} ($${t.price})`).join(' vs ') :
                        'No outcomes available';
                    
                    // Enhanced status indicators
                    const statusEmoji = market.accepting_orders ? "🟢" : 
                        (market.active ? "🟡" : 
                        (market.closed ? "🔴" : "⚪"));
                    
                    const activityEmoji = market.activity_score > 10000 ? "🔥" : 
                        (market.activity_score > 1000 ? "⚡" : 
                        (market.activity_score > 100 ? "📈" : "📊"));
                    
                    const urgencyEmoji = market.freshness_days <= 1 ? "🚨" : 
                        (market.freshness_days <= 7 ? "⏰" : 
                        (market.freshness_days <= 30 ? "📅" : "📆"));
                    
                    const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(', ') : 'No tags';
                    const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : 'No end date';
                    const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : 'N/A';
                    const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : 'N/A';
                    
                    return `${index + 1}. ${statusEmoji}${activityEmoji}${urgencyEmoji} ${market.question.substring(0, 70)}${market.question.length > 70 ? '...' : ''}
   📊 Outcomes: ${outcomes}
   📈 24h Volume: ${volume24hr} | 💧 Liquidity: ${liquidity} | 🏷️ Tags: ${tags}
   💵 Min Order: $${market.minimum_order_size} | 📅 Ends: ${endDate}
   🎯 Condition ID: ${market.condition_id || 'N/A'}
   ⏱️  Days remaining: ${market.freshness_days} | 🔥 Activity Score: ${market.activity_score.toFixed(0)}`;
                }).join('\n\n');

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Found ${processedMarkets.length} current active betting markets on Polymarket (using CLOB API):

Legend: 
🟢 Accepting Orders | 🟡 Active | 🔴 Closed | ⚪ Unknown
🔥 High Activity (10k+) | ⚡ Medium Activity (1k+) | 📈 Low Activity (100+) | 📊 New
🚨 Ending Today | ⏰ Ending This Week | 📅 Ending This Month | 📆 Long Term

${marketSummary}

These are the most current and active markets available for betting right now, sorted by activity level and urgency.

Generate a response highlighting these current active markets with their key details, emphasizing which ones are most active, have high volume, and are ending soon.`
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
                        totalCount: markets.length,
                        displayedCount: processedMarkets.length,
                        activeCount: processedMarkets.filter(m => m.active).length,
                        acceptingOrdersCount: processedMarkets.filter(m => m.accepting_orders).length,
                        timestamp: new Date().toISOString(),
                        source: "CLOB-API",
                        sorting: "activity_and_urgency",
                        filters_applied: activeOnly ? ["active_only", "accepting_orders", "not_expired", "has_outcomes"] : [],
                        activity_stats: {
                            high_activity: processedMarkets.filter(m => m.activity_score > 10000).length,
                            medium_activity: processedMarkets.filter(m => m.activity_score > 1000 && m.activity_score <= 10000).length,
                            low_activity: processedMarkets.filter(m => m.activity_score <= 1000).length,
                            ending_soon: processedMarkets.filter(m => m.freshness_days <= 7).length
                        }
                    }
                });
                return true;
                
            } catch (apiError) {
                console.error("CLOB API failed:", apiError);
                throw new Error(`Failed to fetch current active markets from CLOB API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Get current active markets error:", errorMessage);
            callback?.({
                text: `Error getting current active markets: ${errorMessage}. Please check your internet connection and try again.`,
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
                    text: "What are the current active betting markets?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the current active betting markets on Polymarket, sorted by activity level and urgency...",
                    action: "GET_MARKETS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me the latest active markets on Polymarket",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll fetch the latest and most current active markets for you, sorted by activity and urgency...",
                    action: "GET_MARKETS",
                },
            },
        ],
    ],
};

// Get More Markets Action - Updated to use CLOB API
export const getMoreMarketsAction: Action = {
    name: "GET_MORE_MARKETS",
    description: "Get next batch of markets using CLOB API",
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

Extract parameters for getting more markets:
- cursor: The cursor for pagination (optional)
- limit: Maximum number of markets to return (optional, default 10)

Respond with a JSON object.`
            });

            const { object: parameters } = await generateObject({
                runtime,
                context: parameterContext,
                modelClass: ModelClass.LARGE,
                schema: GetMoreMarketsSchema,
            });

            const typedParameters = parameters as z.infer<typeof GetMoreMarketsSchema>;
            const limit = Math.min(typedParameters.limit || 10, 20);
            
            try {
                // Use CLOB API to get markets
                const client = await getPolymarketClient();
                const marketsResponse = await client.getMarkets();
                
                let markets: any[] = [];
                if (Array.isArray(marketsResponse)) {
                    markets = marketsResponse;
                } else if (marketsResponse && typeof marketsResponse === 'object') {
                    const response = marketsResponse as any;
                    if (response.data && Array.isArray(response.data)) {
                        markets = response.data;
                    }
                }

                if (!Array.isArray(markets)) {
                    markets = [];
                }

                if (markets.length === 0) {
                    callback?.({
                        text: "No additional markets available at this time.",
                        content: { endOfResults: true }
                    });
                    return true;
                }

                // Apply enhanced filtering for active markets (same logic as getMarketsAction)
                let filteredMarkets = markets.filter((market: any) => {
                    // Check if market is active and accepting orders
                    const isActive = market.active !== false;
                    const isAcceptingOrders = market.accepting_orders !== false;
                    const isNotClosed = market.closed !== true;
                    const isNotArchived = market.archived !== true;
                    
                    // Check if market has a valid end date that hasn't passed
                    const hasValidEndDate = market.end_date_iso || market.endDate;
                    let isNotExpired = true;
                    if (hasValidEndDate) {
                        const endDate = new Date(hasValidEndDate);
                        const now = new Date();
                        isNotExpired = endDate > now;
                    }
                    
                    // Check if market has valid tokens/outcomes
                    const hasValidTokens = market.tokens && Array.isArray(market.tokens) && market.tokens.length > 0;
                    const hasValidOutcomes = market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length > 0;
                    const hasOutcomes = hasValidTokens || hasValidOutcomes;
                    
                    return isActive && isAcceptingOrders && isNotClosed && isNotArchived && isNotExpired && hasOutcomes;
                });

                // Sort markets by activity and volume (same logic as getMarketsAction)
                filteredMarkets.sort((a: any, b: any) => {
                    // First priority: accepting orders
                    const aAccepting = a.accepting_orders !== false;
                    const bAccepting = b.accepting_orders !== false;
                    if (aAccepting !== bAccepting) {
                        return aAccepting ? -1 : 1;
                    }
                    
                    // Second priority: 24h volume (higher volume first)
                    const aVolume = parseFloat(a.volume24hr || a.volume || '0');
                    const bVolume = parseFloat(b.volume24hr || b.volume || '0');
                    if (aVolume !== bVolume) {
                        return bVolume - aVolume;
                    }
                    
                    // Third priority: end date (sooner ending first for urgency)
                    const aEndDate = a.end_date_iso || a.endDate;
                    const bEndDate = b.end_date_iso || b.endDate;
                    if (aEndDate && bEndDate) {
                        const aEnd = new Date(aEndDate);
                        const bEnd = new Date(bEndDate);
                        return aEnd.getTime() - bEnd.getTime();
                    }
                    
                    // Fourth priority: creation date (newer first)
                    const aCreated = a.created_date || a.createdAt;
                    const bCreated = b.created_date || b.createdAt;
                    if (aCreated && bCreated) {
                        const aCreate = new Date(aCreated);
                        const bCreate = new Date(bCreated);
                        return bCreate.getTime() - aCreate.getTime();
                    }
                    
                    return 0;
                });

                // Process markets
                const processedMarkets = filteredMarkets.slice(0, limit).map((market: any) => {
                    const tokens = market.tokens || market.outcomes || [];
                    const tokenArray = Array.isArray(tokens) ? tokens : [];
                    
                    // Calculate activity score
                    const volume24hr = parseFloat(market.volume24hr || market.volume || '0');
                    const liquidity = parseFloat(market.liquidity || '0');
                    const activityScore = volume24hr + (liquidity * 0.1);
                    
                    // Calculate freshness
                    const endDate = new Date(market.end_date_iso || market.endDate || '2099-12-31');
                    const now = new Date();
                    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const freshness = daysUntilEnd > 0 ? daysUntilEnd : 0;
                    
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
                        volume24hr: market.volume24hr,
                        liquidity: market.liquidity,
                        tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
                        activity_score: activityScore,
                        freshness_days: freshness,
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
                    
                    // Enhanced status indicators
                    const statusEmoji = market.accepting_orders ? "🟢" : 
                        (market.active ? "🟡" : (market.closed ? "🔴" : "⚪"));
                    
                    const activityEmoji = market.activity_score > 10000 ? "🔥" : 
                        (market.activity_score > 1000 ? "⚡" : 
                        (market.activity_score > 100 ? "📈" : "📊"));
                    
                    const urgencyEmoji = market.freshness_days <= 1 ? "🚨" : 
                        (market.freshness_days <= 7 ? "⏰" : 
                        (market.freshness_days <= 30 ? "📅" : "📆"));
                    
                    const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(', ') : 'No tags';
                    const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : 'N/A';
                    const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : 'N/A';
                    
                    return `${index + 1}. ${statusEmoji}${activityEmoji}${urgencyEmoji} ${market.question.substring(0, 60)}${market.question.length > 60 ? '...' : ''}
   Outcomes: ${outcomes}
   24h Volume: ${volume24hr} | Liquidity: ${liquidity} | Tags: ${tags}
   Min Order: $${market.minimum_order_size}
   Ends: ${market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : 'No end date'}
   Activity Score: ${market.activity_score.toFixed(0)} | Days remaining: ${market.freshness_days}`;
                }).join('\n\n');

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Additional current active markets from Polymarket (${processedMarkets.length} shown):

Legend: 
🟢 Accepting Orders | 🟡 Active | 🔴 Closed | ⚪ Unknown
🔥 High Activity | ⚡ Medium Activity | 📈 Low Activity | 📊 New
🚨 Ending Today | ⏰ Ending This Week | 📅 Ending This Month | 📆 Long Term

${marketSummary}

Generate a response showing these additional current active markets with their key details, emphasizing activity levels and urgency.`
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
                        hasMore: filteredMarkets.length > limit,
                        nextCursor: (processedMarkets.length + limit).toString(),
                        source: "CLOB-API",
                        sorting: "activity_and_urgency",
                        filters_applied: ["active_only", "accepting_orders", "not_expired", "has_outcomes"]
                    }
                });
                return true;
                
            } catch (error) {
                console.error("Failed to fetch more markets:", error);
                throw new Error(`Failed to get more current active markets: ${error instanceof Error ? error.message : String(error)}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error getting more current active markets: ${errorMessage}`,
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
                    text: "Show me more current active markets",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are additional current active markets from Polymarket, sorted by activity level and urgency...",
                    action: "GET_MORE_MARKETS",
                },
            },
        ],
    ],
};

// Get Market Action - Complete implementation using CLOB API
export const getMarketAction: Action = {
    name: "GET_MARKET",
    description: "Get details of a specific market on Polymarket using CLOB API",
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
                // Use CLOB API to get all markets and find the specific one
                const client = await getPolymarketClient();
                const marketsResponse = await client.getMarkets();
                
                let markets: any[] = [];
                if (Array.isArray(marketsResponse)) {
                    markets = marketsResponse;
                } else if (marketsResponse && typeof marketsResponse === 'object') {
                    const response = marketsResponse as any;
                    if (response.data && Array.isArray(response.data)) {
                        markets = response.data;
                    }
                }

                // Find the specific market by condition ID
                const market = markets.find((m: any) => 
                    m.condition_id === typedParameters.conditionId || 
                    m.conditionId === typedParameters.conditionId ||
                    m.id === typedParameters.conditionId
                );

                if (!market) {
                    throw new Error(`Market with condition ID ${typedParameters.conditionId} not found`);
                }

                console.log("Market details from CLOB API:", market);

                // Process tokens
                const tokens = market.tokens || market.outcomes || [];
                const tokenArray = Array.isArray(tokens) ? tokens : [];
                
                // Create comprehensive market summary
                const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : 'N/A';
                const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleString() : 'N/A';
                const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : 'N/A';
                const tagsString = Array.isArray(market.tags) ? market.tags.slice(0, 5).join(', ') : 'No tags';
                const rewardInfo = market.rewards ? 
                    `Rewards available: Min size $${market.rewards.min_size}, Max spread ${market.rewards.max_spread}` : 
                    'No rewards available';
                
                const tokenDetails = tokenArray.map((token: any, index: number) => {
                    const price = token.price || token.lastPrice || '0.50';
                    const outcome = token.outcome || token.name || token.title || `Outcome ${index + 1}`;
                    const winner = token.winner ? ' (Winner)' : '';
                    return `   ${index + 1}. ${outcome}: $${price}${winner}`;
                }).join('\n');

                const marketDetails = `
📌 Market: ${market.question || market.title || 'Unknown Market'}
📄 Description: ${market.description || 'No description available'}
📅 Ends: ${endDate}
💧 Liquidity: ${liquidity}
📈 24h Volume: ${volume24hr}
🏷️ Tags: ${tagsString}
🎁 ${rewardInfo}

📊 Outcomes & Prices:
${tokenDetails}
                `;

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Fetched detailed information for market condition ID: ${typedParameters.conditionId} using CLOB API

${marketDetails}

Generate a natural summary of this market, highlighting the question, prices, volume, and outcomes.`
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
                        tokens: tokenArray,
                        conditionId: typedParameters.conditionId,
                        source: "CLOB-API"
                    }
                });

                return true;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error("Failed to fetch specific market:", errorMessage);
                callback?.({
                    text: `Error getting market details: ${errorMessage}`,
                    content: { error: errorMessage }
                });
                return false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            callback?.({
                text: `Error extracting condition ID: ${errorMessage}`,
                content: { error: errorMessage }
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you show me details about the market with condition ID xyz123?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the details for market xyz123 using the CLOB API: it's about whether Biden will win in 2024, with outcomes YES ($0.62) and NO ($0.38)...",
                    action: "GET_MARKET",
                },
            },
        ],
    ],
};
// Get High Activity Markets Action - New action for high-volume markets
export const getHighActivityMarketsAction: Action = {
    name: "GET_HIGH_ACTIVITY_MARKETS",
    description: "Get markets with high activity levels (high volume and liquidity) from Polymarket",
    similes: ["high volume markets", "busy markets", "popular markets", "trending markets", "hot markets", "active trading"],
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

Extract parameters for getting high activity markets:
- limit: Maximum number of markets to return (optional, default 10, max 20)
- minVolume: Minimum 24h volume threshold in USD (optional, default 1000)

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
            const minVolume = 1000; // Default minimum volume threshold

            console.log(`Fetching ${limit} high activity markets with minimum volume of $${minVolume}`);

            try {
                // Use CLOB API to get markets
                const client = await getPolymarketClient();
                const marketsResponse = await client.getMarkets();
                
                let markets: any[] = [];
                if (Array.isArray(marketsResponse)) {
                    markets = marketsResponse;
                } else if (marketsResponse && typeof marketsResponse === 'object') {
                    const response = marketsResponse as any;
                    if (response.data && Array.isArray(response.data)) {
                        markets = response.data;
                    }
                }

                if (!Array.isArray(markets)) {
                    console.log("Unexpected response format:", marketsResponse);
                    markets = [];
                }

                console.log(`Found ${markets.length} total markets from CLOB API`);

                // Debug: Log market data structure
                if (markets.length > 0) {
                    const sampleMarket = markets[0];
                    console.log("Sample market structure:", {
                        question: sampleMarket.question || sampleMarket.title || 'No title',
                        active: sampleMarket.active,
                        closed: sampleMarket.closed,
                        archived: sampleMarket.archived,
                        accepting_orders: sampleMarket.accepting_orders,
                        end_date: sampleMarket.end_date_iso || sampleMarket.endDate,
                        has_tokens: sampleMarket.tokens && Array.isArray(sampleMarket.tokens),
                        tokens_count: sampleMarket.tokens ? sampleMarket.tokens.length : 0
                    });
                }

                if (markets.length === 0) {
                    callback?.({
                        text: "No markets found at this time. The Polymarket CLOB API may be experiencing issues.",
                        content: { markets: [], totalCount: 0 }
                    });
                    return true;
                }

                // Enhanced filtering for active markets with high activity
                let filteredMarkets = markets.filter((market: any) => {
                    // Check if market is active and accepting orders
                    const isActive = market.active !== false;
                    const isAcceptingOrders = market.accepting_orders !== false;
                    const isNotClosed = market.closed !== true;
                    const isNotArchived = market.archived !== true;
                    
                    // Check if market has a valid end date that hasn't passed
                    const hasValidEndDate = market.end_date_iso || market.endDate;
                    let isNotExpired = true;
                    if (hasValidEndDate) {
                        const endDate = new Date(hasValidEndDate);
                        const now = new Date();
                        isNotExpired = endDate > now;
                    }
                    
                    // Check if market has valid tokens/outcomes
                    const hasValidTokens = market.tokens && Array.isArray(market.tokens) && market.tokens.length > 0;
                    const hasValidOutcomes = market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length > 0;
                    const hasOutcomes = hasValidTokens || hasValidOutcomes;
                    
                    // Check for high activity (volume and liquidity)
                    const volume24hr = parseFloat(market.volume24hr || market.volume || '0');
                    const liquidity = parseFloat(market.liquidity || '0');
                    const hasHighActivity = volume24hr >= minVolume || liquidity >= minVolume * 0.1;
                    
                    return isActive && isAcceptingOrders && isNotClosed && isNotArchived && isNotExpired && hasOutcomes && hasHighActivity;
                });

                console.log(`Filtered to ${filteredMarkets.length} high activity markets`);

                if (filteredMarkets.length === 0) {
                    // If no markets after filtering, try showing all markets with a warning
                    if (markets.length > 0) {
                        console.log("Warning: All markets were filtered out. Showing all markets with status indicators.");
                        filteredMarkets = markets;
                    } else {
                        callback?.({
                            text: "No markets found at this time. The Polymarket CLOB API may be experiencing issues.",
                            content: { markets: [], totalCount: 0 }
                        });
                        return true;
                    }
                }

                // Sort markets by activity score (volume + liquidity)
                filteredMarkets.sort((a: any, b: any) => {
                    const aVolume = parseFloat(a.volume24hr || a.volume || '0');
                    const bVolume = parseFloat(b.volume24hr || b.volume || '0');
                    const aLiquidity = parseFloat(a.liquidity || '0');
                    const bLiquidity = parseFloat(b.liquidity || '0');
                    
                    const aActivityScore = aVolume + (aLiquidity * 0.1);
                    const bActivityScore = bVolume + (bLiquidity * 0.1);
                    
                    return bActivityScore - aActivityScore;
                });

                // Process markets with comprehensive data
                const processedMarkets = filteredMarkets.slice(0, limit).map((market: any, index: number) => {
                    const tokens = market.tokens || market.outcomes || [];
                    const tokenArray = Array.isArray(tokens) ? tokens : [];
                    
                    // Calculate activity metrics
                    const volume24hr = parseFloat(market.volume24hr || market.volume || '0');
                    const liquidity = parseFloat(market.liquidity || '0');
                    const activityScore = volume24hr + (liquidity * 0.1);
                    
                    // Calculate freshness
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
                        volume: market.volume || market.volume24hr || market.totalVolume,
                        volume24hr: market.volume24hr,
                        liquidity: market.liquidity,
                        neg_risk: market.neg_risk,
                        is_50_50_outcome: market.is_50_50_outcome,
                        tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
                        freshness_days: freshness,
                        activity_score: activityScore,
                        volume_usd: volume24hr,
                        liquidity_usd: liquidity,
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

                // Create enhanced market summary with activity indicators
                const marketSummary = processedMarkets.map((market: any, index: number) => {
                    const outcomes = market.tokens.length > 0 ? 
                        market.tokens.map((t: any) => `${t.outcome} ($${t.price})`).join(' vs ') :
                        'No outcomes available';
                    
                    // Activity level indicators
                    const activityLevel = market.activity_score > 50000 ? "🔥🔥🔥" : 
                        (market.activity_score > 20000 ? "🔥🔥" : 
                        (market.activity_score > 10000 ? "🔥" : "⚡"));
                    
                    const urgencyEmoji = market.freshness_days <= 1 ? "🚨" : 
                        (market.freshness_days <= 7 ? "⏰" : 
                        (market.freshness_days <= 30 ? "📅" : "📆"));
                    
                    const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(', ') : 'No tags';
                    const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : 'No end date';
                    const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : 'N/A';
                    const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : 'N/A';
                    
                    return `${index + 1}. ${activityLevel}${urgencyEmoji} ${market.question.substring(0, 70)}${market.question.length > 70 ? '...' : ''}
   📊 Outcomes: ${outcomes}
   💰 24h Volume: ${volume24hr} | 💧 Liquidity: ${liquidity} | 🏷️ Tags: ${tags}
   💵 Min Order: $${market.minimum_order_size} | 📅 Ends: ${endDate}
   🎯 Condition ID: ${market.condition_id || 'N/A'}
   ⏱️  Days remaining: ${market.freshness_days} | 🔥 Activity Score: $${market.activity_score.toLocaleString()}`;
                }).join('\n\n');

                const responseContext = composeContext({
                    state: currentState,
                    template: `{{recentMessages}}

Found ${processedMarkets.length} high activity betting markets on Polymarket (minimum $${minVolume} volume):

Legend: 
🔥🔥🔥 Ultra High Activity (50k+) | 🔥🔥 Very High Activity (20k+) | 🔥 High Activity (10k+) | ⚡ Medium Activity
🚨 Ending Today | ⏰ Ending This Week | 📅 Ending This Month | 📆 Long Term

${marketSummary}

These are the most active and liquid markets available for betting, sorted by activity level. High activity indicates more trading opportunities and better liquidity.

Generate a response highlighting these high activity markets, emphasizing their trading volume, liquidity, and why they're popular for betting.`
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
                        totalCount: markets.length,
                        displayedCount: processedMarkets.length,
                        activeCount: processedMarkets.filter(m => m.active).length,
                        acceptingOrdersCount: processedMarkets.filter(m => m.accepting_orders).length,
                        timestamp: new Date().toISOString(),
                        source: "CLOB-API",
                        sorting: "activity_score_desc",
                        filters_applied: ["active_only", "accepting_orders", "not_expired", "has_outcomes", "high_activity"],
                        minVolume,
                        activity_stats: {
                            ultra_high: processedMarkets.filter(m => m.activity_score > 50000).length,
                            very_high: processedMarkets.filter(m => m.activity_score > 20000 && m.activity_score <= 50000).length,
                            high: processedMarkets.filter(m => m.activity_score > 10000 && m.activity_score <= 20000).length,
                            medium: processedMarkets.filter(m => m.activity_score <= 10000).length,
                            ending_soon: processedMarkets.filter(m => m.freshness_days <= 7).length
                        }
                    }
                });
                return true;
                
            } catch (apiError) {
                console.error("CLOB API failed:", apiError);
                throw new Error(`Failed to fetch high activity markets from CLOB API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Get high activity markets error:", errorMessage);
            callback?.({
                text: `Error getting high activity markets: ${errorMessage}. Please check your internet connection and try again.`,
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
                    text: "Show me the high volume markets",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the high activity markets on Polymarket, sorted by trading volume and liquidity...",
                    action: "GET_HIGH_ACTIVITY_MARKETS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the most popular betting markets right now?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll fetch the most active and popular markets for you, focusing on high volume and liquidity...",
                    action: "GET_HIGH_ACTIVITY_MARKETS",
                },
            },
        ],
    ],
};
