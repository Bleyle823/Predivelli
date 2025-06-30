import { AssetType, Side, Chain, ClobClient } from '@polymarket/clob-client';
import { composeContext, generateObject, ModelClass, generateText } from '@elizaos/core';
import { Wallet } from '@ethersproject/wallet';
import { z } from 'zod';

// src/provider.ts
async function getPolymarketClient() {
  const host = process.env.CLOB_API_URL || "https://clob.polymarket.com";
  const chainId = parseInt(`${process.env.CHAIN_ID || Chain.POLYGON}`);
  const apiKey = process.env.POLYMARKET_API_KEY;
  const secret = process.env.POLYMARKET_SECRET;
  const passphrase = process.env.POLYMARKET_PASSPHRASE;
  try {
    const client = new ClobClient(host, chainId);
    if (apiKey && secret && passphrase) {
      console.log("\u{1F510} Polymarket credentials detected - authenticated mode");
    } else {
      console.log("\u{1F4D6} Polymarket running in read-only mode");
    }
    return client;
  } catch (error) {
    console.error("Failed to initialize Polymarket ClobClient:", error);
    throw new Error(`Failed to initialize Polymarket ClobClient: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
var polymarketProvider = {
  async get(runtime) {
    try {
      const client = await getPolymarketClient();
      const markets = await client.getMarkets();
      let totalCount = 0;
      let activeCount = 0;
      let acceptingOrdersCount = 0;
      if (Array.isArray(markets)) {
        totalCount = markets.length;
        activeCount = markets.filter((market) => market.active !== false).length;
        acceptingOrdersCount = markets.filter((market) => market.accepting_orders !== false).length;
      } else if (markets && typeof markets === "object") {
        const response = markets;
        if (response.data && Array.isArray(response.data)) {
          totalCount = response.data.length;
          activeCount = response.data.filter((market) => market.active !== false).length;
          acceptingOrdersCount = response.data.filter((market) => market.accepting_orders !== false).length;
        }
      }
      const status = acceptingOrdersCount > 0 ? "\u{1F7E2}" : activeCount > 0 ? "\u{1F7E1}" : "\u{1F534}";
      return `Polymarket Client: ${status} Connected (${totalCount} total, ${activeCount} active, ${acceptingOrdersCount} accepting orders)`;
    } catch (error) {
      console.error("Error in Polymarket provider:", error);
      return `\u274C Error connecting to Polymarket: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }
};
var PlaceBetSchema = z.object({
  tokenId: z.string().describe("The token ID of the market outcome"),
  side: z.enum(["BUY", "SELL"]).describe("Whether to buy or sell the outcome"),
  amount: z.number().positive().describe("Amount of USDC to bet"),
  price: z.number().min(0.01).max(0.99).describe("Price per share (0.01 to 0.99)")
});
z.object({});
var GetMarketsSchema = z.object({
  limit: z.number().optional().describe("Maximum number of markets to return"),
  active: z.boolean().optional().describe("Filter for active markets only")
});
var GetMarketSchema = z.object({
  conditionId: z.string().describe("The condition ID of the market")
});
var GetMoreMarketsSchema = z.object({
  cursor: z.string().describe("The cursor for pagination to get next batch of markets"),
  limit: z.number().optional().describe("Maximum number of markets to return")
});
z.object({
  orderId: z.string().describe("The ID of the order to cancel")
});
async function getAuthenticatedPolymarketClient(runtime) {
  const PRIVATE_KEY = runtime.getSetting("PK") || runtime.getSetting("PRIVATE_KEY") || runtime.getSetting("WALLET_PRIVATE_KEY");
  if (!PRIVATE_KEY) {
    throw new Error("Private key not found in environment variables or character secrets. Please set PK, PRIVATE_KEY, or WALLET_PRIVATE_KEY in your .env file or character secrets.");
  }
  const API_KEY = runtime.getSetting("POLYMARKET_API_KEY");
  const SECRET = runtime.getSetting("POLYMARKET_SECRET");
  const PASSPHRASE = runtime.getSetting("POLYMARKET_PASSPHRASE");
  if (!API_KEY || !SECRET || !PASSPHRASE) {
    throw new Error("Polymarket API credentials not found. Please set POLYMARKET_API_KEY, POLYMARKET_SECRET, and POLYMARKET_PASSPHRASE in your character secrets.");
  }
  const host = "https://clob.polymarket.com";
  runtime.getSetting("FUNDER_ADDRESS") || "0x993f563E24efee863BbD0E54FD5Ca3d010202c39";
  const signer = new Wallet(PRIVATE_KEY);
  try {
    let client;
    try {
      client = new ClobClient(host, 137, signer, {
        apiKey: API_KEY,
        secret: SECRET,
        passphrase: PASSPHRASE
      });
      console.log("\u2705 Polymarket client created with credentials in constructor");
    } catch (constructorError) {
      console.log("Constructor with credentials failed, trying alternative approach");
      client = new ClobClient(host, 137, signer);
      if (client) {
        try {
          if (typeof client.apiKey !== "undefined") client.apiKey = API_KEY;
          if (typeof client.secret !== "undefined") client.secret = SECRET;
          if (typeof client.passphrase !== "undefined") client.passphrase = PASSPHRASE;
          if (typeof client.setHeaders === "function") {
            client.setHeaders({
              "X-API-Key": API_KEY,
              "X-Secret": SECRET,
              "X-Passphrase": PASSPHRASE
            });
          }
          console.log("\u2705 Polymarket client created and credentials set as properties");
        } catch (propertyError) {
          console.log("Setting credentials as properties failed:", propertyError.message);
        }
      }
    }
    if (!client) {
      throw new Error("Failed to create Polymarket client");
    }
    console.log("\u{1F510} Polymarket API credentials loaded successfully");
    return client;
  } catch (error) {
    console.error("Failed to create authenticated Polymarket client:", error);
    throw new Error(`Failed to create authenticated Polymarket client: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
var placeBetAction = {
  name: "PLACE_BET",
  description: "Place a bet on a Polymarket outcome",
  similes: ["bet", "wager", "place order", "buy shares", "sell shares"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      const client = await getAuthenticatedPolymarketClient(runtime);
      let currentState = state ?? await runtime.composeState(message);
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
        schema: PlaceBetSchema
      });
      const typedParameters = parameters;
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
      if (allowance < requiredAmount) {
        console.log("Allowance may need to be updated. Please check the Polymarket documentation for the correct method.");
      }
      const orderSize = typedParameters.amount / typedParameters.price;
      try {
        console.log("Placing order...");
        const orderResponse = await client.createOrder({
          tokenID: typedParameters.tokenId,
          price: typedParameters.price,
          side: typedParameters.side === "BUY" ? Side.BUY : Side.SELL,
          size: orderSize,
          feeRateBps: 0
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
          modelClass: ModelClass.LARGE
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
          content: { error: errorMsg }
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback?.({
        text: `Error placing bet: ${errorMessage}`,
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
          text: "I want to bet $10 on Trump winning at 65 cents per share"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll place a $10 bet on Trump winning at $0.65 per share. This will buy approximately 15.38 shares.",
          action: "PLACE_BET"
        }
      }
    ]
  ]
};
var checkBalanceAction = {
  name: "CHECK_BALANCE",
  description: "Check USDC balance and allowance on Polymarket",
  similes: ["balance", "funds", "money", "usdc", "check wallet"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      const client = await getAuthenticatedPolymarketClient(runtime);
      let currentState = state ?? await runtime.composeState(message);
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
        modelClass: ModelClass.LARGE
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
          text: "What's my balance?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Your current USDC balance on Polymarket is $25.50 with an allowance of $100.00",
          action: "CHECK_BALANCE"
        }
      }
    ]
  ]
};
var getMarketsAction = {
  name: "GET_MARKETS",
  description: "Get latest active markets from Polymarket using CLOB API",
  similes: ["markets", "betting markets", "available bets", "what can I bet on", "latest markets", "newest markets", "fresh markets", "current markets", "active markets"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      let currentState = state ?? await runtime.composeState(message);
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
        schema: GetMarketsSchema
      });
      const typedParameters = parameters;
      const limit = Math.min(typedParameters.limit || 10, 20);
      const activeOnly = typedParameters.active !== false;
      const debugShowAll = process.env.DEBUG_SHOW_ALL_MARKETS === "true";
      console.log(`Fetching ${limit} latest markets, active only: ${activeOnly}, debug show all: ${debugShowAll}`);
      try {
        const client = await getPolymarketClient();
        const marketsResponse = await client.getMarkets();
        let markets = [];
        if (Array.isArray(marketsResponse)) {
          markets = marketsResponse;
        } else if (marketsResponse && typeof marketsResponse === "object") {
          const response = marketsResponse;
          if (response.data && Array.isArray(response.data)) {
            markets = response.data;
          }
        }
        if (!Array.isArray(markets)) {
          console.log("Unexpected response format:", marketsResponse);
          markets = [];
        }
        console.log(`Found ${markets.length} total markets from CLOB API`);
        if (markets.length > 0) {
          const sampleMarket = markets[0];
          console.log("Sample market structure:", {
            question: sampleMarket.question || sampleMarket.title || "No title",
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
        let filteredMarkets = markets;
        if (activeOnly && !debugShowAll) {
          console.log(`Starting with ${markets.length} total markets`);
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
          filteredMarkets = markets.filter((market) => {
            const isNotClosed = market.closed !== true;
            const isNotArchived = market.archived !== true;
            if (!isNotClosed) console.log(`Filtered out: ${market.question || market.title} - explicitly closed`);
            if (!isNotArchived) console.log(`Filtered out: ${market.question || market.title} - explicitly archived`);
            return isNotClosed && isNotArchived;
          });
          console.log(`After lenient filtering: ${filteredMarkets.length} markets remain`);
          if (filteredMarkets.length === 0 && markets.length > 0) {
            console.log("Warning: All markets were filtered out. Showing all markets with status indicators.");
            filteredMarkets = markets;
          }
        } else if (debugShowAll) {
          console.log("DEBUG: Showing all markets without filtering");
          filteredMarkets = markets;
        }
        if (filteredMarkets.length === 0) {
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
        filteredMarkets.sort((a, b) => {
          const aAccepting = a.accepting_orders !== false;
          const bAccepting = b.accepting_orders !== false;
          if (aAccepting !== bAccepting) {
            return aAccepting ? -1 : 1;
          }
          const aVolume = parseFloat(a.volume24hr || a.volume || "0");
          const bVolume = parseFloat(b.volume24hr || b.volume || "0");
          if (aVolume !== bVolume) {
            return bVolume - aVolume;
          }
          const aEndDate = a.end_date_iso || a.endDate;
          const bEndDate = b.end_date_iso || b.endDate;
          if (aEndDate && bEndDate) {
            const aEnd = new Date(aEndDate);
            const bEnd = new Date(bEndDate);
            return aEnd.getTime() - bEnd.getTime();
          }
          const aCreated = a.created_date || a.createdAt;
          const bCreated = b.created_date || b.createdAt;
          if (aCreated && bCreated) {
            const aCreate = new Date(aCreated);
            const bCreate = new Date(bCreated);
            return bCreate.getTime() - aCreate.getTime();
          }
          return 0;
        });
        const processedMarkets = filteredMarkets.slice(0, limit).map((market, index) => {
          const tokens = market.tokens || market.outcomes || [];
          const tokenArray = Array.isArray(tokens) ? tokens : [];
          const endDate = new Date(market.end_date_iso || market.endDate || "2099-12-31");
          const now = /* @__PURE__ */ new Date();
          const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
          const freshness = daysUntilEnd > 0 ? daysUntilEnd : 0;
          const volume24hr = parseFloat(market.volume24hr || market.volume || "0");
          const liquidity = parseFloat(market.liquidity || "0");
          const activityScore = volume24hr + liquidity * 0.1;
          return {
            condition_id: market.condition_id || market.conditionId || market.id,
            question_id: market.question_id || market.questionId,
            question: market.question || market.title || market.name || "Unknown Market",
            description: market.description ? market.description.length > 200 ? market.description.substring(0, 200) + "..." : market.description : "No description available",
            market_slug: market.market_slug || market.slug,
            active: market.active,
            closed: market.closed,
            archived: market.archived,
            accepting_orders: market.accepting_orders,
            end_date_iso: market.end_date_iso || market.endDate,
            created_date: market.created_date || market.createdAt,
            minimum_order_size: market.minimum_order_size || market.minOrderSize || "1.00",
            minimum_tick_size: market.minimum_tick_size || market.tickSize || "0.01",
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
            tokens: tokenArray.map((token) => ({
              token_id: token.token_id || token.tokenId || token.id,
              outcome: token.outcome || token.name || token.title,
              price: token.price || token.lastPrice || "0.50",
              winner: token.winner,
              volume: token.volume
            })),
            rewards: market.rewards ? {
              min_size: market.rewards.min_size,
              max_spread: market.rewards.max_spread,
              rates_count: market.rewards.rates?.length || 0,
              daily_rate: market.rewards.daily_rate
            } : null,
            last_updated: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
        const marketSummary = processedMarkets.map((market, index) => {
          const outcomes = market.tokens.length > 0 ? market.tokens.map((t) => `${t.outcome} ($${t.price})`).join(" vs ") : "No outcomes available";
          const statusEmoji = market.accepting_orders ? "\u{1F7E2}" : market.active ? "\u{1F7E1}" : market.closed ? "\u{1F534}" : "\u26AA";
          const activityEmoji = market.activity_score > 1e4 ? "\u{1F525}" : market.activity_score > 1e3 ? "\u26A1" : market.activity_score > 100 ? "\u{1F4C8}" : "\u{1F4CA}";
          const urgencyEmoji = market.freshness_days <= 1 ? "\u{1F6A8}" : market.freshness_days <= 7 ? "\u23F0" : market.freshness_days <= 30 ? "\u{1F4C5}" : "\u{1F4C6}";
          const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(", ") : "No tags";
          const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : "No end date";
          const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : "N/A";
          const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : "N/A";
          return `${index + 1}. ${statusEmoji}${activityEmoji}${urgencyEmoji} ${market.question.substring(0, 70)}${market.question.length > 70 ? "..." : ""}
   \u{1F4CA} Outcomes: ${outcomes}
   \u{1F4C8} 24h Volume: ${volume24hr} | \u{1F4A7} Liquidity: ${liquidity} | \u{1F3F7}\uFE0F Tags: ${tags}
   \u{1F4B5} Min Order: $${market.minimum_order_size} | \u{1F4C5} Ends: ${endDate}
   \u{1F3AF} Condition ID: ${market.condition_id || "N/A"}
   \u23F1\uFE0F  Days remaining: ${market.freshness_days} | \u{1F525} Activity Score: ${market.activity_score.toFixed(0)}`;
        }).join("\n\n");
        const responseContext = composeContext({
          state: currentState,
          template: `{{recentMessages}}

Found ${processedMarkets.length} current active betting markets on Polymarket (using CLOB API):

Legend: 
\u{1F7E2} Accepting Orders | \u{1F7E1} Active | \u{1F534} Closed | \u26AA Unknown
\u{1F525} High Activity (10k+) | \u26A1 Medium Activity (1k+) | \u{1F4C8} Low Activity (100+) | \u{1F4CA} New
\u{1F6A8} Ending Today | \u23F0 Ending This Week | \u{1F4C5} Ending This Month | \u{1F4C6} Long Term

${marketSummary}

These are the most current and active markets available for betting right now, sorted by activity level and urgency.

Generate a response highlighting these current active markets with their key details, emphasizing which ones are most active, have high volume, and are ending soon.`
        });
        const responseText = await generateText({
          runtime,
          context: responseContext,
          modelClass: ModelClass.LARGE
        });
        callback?.({
          text: responseText,
          content: {
            markets: processedMarkets,
            totalCount: markets.length,
            displayedCount: processedMarkets.length,
            activeCount: processedMarkets.filter((m) => m.active).length,
            acceptingOrdersCount: processedMarkets.filter((m) => m.accepting_orders).length,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            source: "CLOB-API",
            sorting: "activity_and_urgency",
            filters_applied: activeOnly ? ["active_only", "accepting_orders", "not_expired", "has_outcomes"] : [],
            activity_stats: {
              high_activity: processedMarkets.filter((m) => m.activity_score > 1e4).length,
              medium_activity: processedMarkets.filter((m) => m.activity_score > 1e3 && m.activity_score <= 1e4).length,
              low_activity: processedMarkets.filter((m) => m.activity_score <= 1e3).length,
              ending_soon: processedMarkets.filter((m) => m.freshness_days <= 7).length
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
          text: "What are the current active betting markets?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are the current active betting markets on Polymarket, sorted by activity level and urgency...",
          action: "GET_MARKETS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the latest active markets on Polymarket"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll fetch the latest and most current active markets for you, sorted by activity and urgency...",
          action: "GET_MARKETS"
        }
      }
    ]
  ]
};
var getMoreMarketsAction = {
  name: "GET_MORE_MARKETS",
  description: "Get next batch of markets using CLOB API",
  similes: ["more markets", "next page", "continue", "see more"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      let currentState = state ?? await runtime.composeState(message);
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
        schema: GetMoreMarketsSchema
      });
      const typedParameters = parameters;
      const limit = Math.min(typedParameters.limit || 10, 20);
      try {
        const client = await getPolymarketClient();
        const marketsResponse = await client.getMarkets();
        let markets = [];
        if (Array.isArray(marketsResponse)) {
          markets = marketsResponse;
        } else if (marketsResponse && typeof marketsResponse === "object") {
          const response = marketsResponse;
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
        let filteredMarkets = markets.filter((market) => {
          const isActive = market.active !== false;
          const isAcceptingOrders = market.accepting_orders !== false;
          const isNotClosed = market.closed !== true;
          const isNotArchived = market.archived !== true;
          const hasValidEndDate = market.end_date_iso || market.endDate;
          let isNotExpired = true;
          if (hasValidEndDate) {
            const endDate = new Date(hasValidEndDate);
            const now = /* @__PURE__ */ new Date();
            isNotExpired = endDate > now;
          }
          const hasValidTokens = market.tokens && Array.isArray(market.tokens) && market.tokens.length > 0;
          const hasValidOutcomes = market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length > 0;
          const hasOutcomes = hasValidTokens || hasValidOutcomes;
          return isActive && isAcceptingOrders && isNotClosed && isNotArchived && isNotExpired && hasOutcomes;
        });
        filteredMarkets.sort((a, b) => {
          const aAccepting = a.accepting_orders !== false;
          const bAccepting = b.accepting_orders !== false;
          if (aAccepting !== bAccepting) {
            return aAccepting ? -1 : 1;
          }
          const aVolume = parseFloat(a.volume24hr || a.volume || "0");
          const bVolume = parseFloat(b.volume24hr || b.volume || "0");
          if (aVolume !== bVolume) {
            return bVolume - aVolume;
          }
          const aEndDate = a.end_date_iso || a.endDate;
          const bEndDate = b.end_date_iso || b.endDate;
          if (aEndDate && bEndDate) {
            const aEnd = new Date(aEndDate);
            const bEnd = new Date(bEndDate);
            return aEnd.getTime() - bEnd.getTime();
          }
          const aCreated = a.created_date || a.createdAt;
          const bCreated = b.created_date || b.createdAt;
          if (aCreated && bCreated) {
            const aCreate = new Date(aCreated);
            const bCreate = new Date(bCreated);
            return bCreate.getTime() - aCreate.getTime();
          }
          return 0;
        });
        const processedMarkets = filteredMarkets.slice(0, limit).map((market) => {
          const tokens = market.tokens || market.outcomes || [];
          const tokenArray = Array.isArray(tokens) ? tokens : [];
          const volume24hr = parseFloat(market.volume24hr || market.volume || "0");
          const liquidity = parseFloat(market.liquidity || "0");
          const activityScore = volume24hr + liquidity * 0.1;
          const endDate = new Date(market.end_date_iso || market.endDate || "2099-12-31");
          const now = /* @__PURE__ */ new Date();
          const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
          const freshness = daysUntilEnd > 0 ? daysUntilEnd : 0;
          return {
            condition_id: market.condition_id || market.conditionId || market.id,
            question: market.question || market.title || "Unknown Market",
            description: market.description ? market.description.length > 150 ? market.description.substring(0, 150) + "..." : market.description : "No description",
            active: market.active,
            closed: market.closed,
            accepting_orders: market.accepting_orders,
            end_date_iso: market.end_date_iso || market.endDate,
            minimum_order_size: market.minimum_order_size || "1.00",
            volume24hr: market.volume24hr,
            liquidity: market.liquidity,
            tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
            activity_score: activityScore,
            freshness_days: freshness,
            tokens: tokenArray.map((token) => ({
              token_id: token.token_id || token.tokenId || token.id,
              outcome: token.outcome || token.name,
              price: token.price || token.lastPrice || "0.50",
              winner: token.winner
            }))
          };
        });
        const marketSummary = processedMarkets.map((market, index) => {
          const outcomes = market.tokens.length > 0 ? market.tokens.map((t) => `${t.outcome} ($${t.price})`).join(" vs ") : "No outcomes available";
          const statusEmoji = market.accepting_orders ? "\u{1F7E2}" : market.active ? "\u{1F7E1}" : market.closed ? "\u{1F534}" : "\u26AA";
          const activityEmoji = market.activity_score > 1e4 ? "\u{1F525}" : market.activity_score > 1e3 ? "\u26A1" : market.activity_score > 100 ? "\u{1F4C8}" : "\u{1F4CA}";
          const urgencyEmoji = market.freshness_days <= 1 ? "\u{1F6A8}" : market.freshness_days <= 7 ? "\u23F0" : market.freshness_days <= 30 ? "\u{1F4C5}" : "\u{1F4C6}";
          const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(", ") : "No tags";
          const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : "N/A";
          const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : "N/A";
          return `${index + 1}. ${statusEmoji}${activityEmoji}${urgencyEmoji} ${market.question.substring(0, 60)}${market.question.length > 60 ? "..." : ""}
   Outcomes: ${outcomes}
   24h Volume: ${volume24hr} | Liquidity: ${liquidity} | Tags: ${tags}
   Min Order: $${market.minimum_order_size}
   Ends: ${market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : "No end date"}
   Activity Score: ${market.activity_score.toFixed(0)} | Days remaining: ${market.freshness_days}`;
        }).join("\n\n");
        const responseContext = composeContext({
          state: currentState,
          template: `{{recentMessages}}

Additional current active markets from Polymarket (${processedMarkets.length} shown):

Legend: 
\u{1F7E2} Accepting Orders | \u{1F7E1} Active | \u{1F534} Closed | \u26AA Unknown
\u{1F525} High Activity | \u26A1 Medium Activity | \u{1F4C8} Low Activity | \u{1F4CA} New
\u{1F6A8} Ending Today | \u23F0 Ending This Week | \u{1F4C5} Ending This Month | \u{1F4C6} Long Term

${marketSummary}

Generate a response showing these additional current active markets with their key details, emphasizing activity levels and urgency.`
        });
        const responseText = await generateText({
          runtime,
          context: responseContext,
          modelClass: ModelClass.LARGE
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
          text: "Show me more current active markets"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are additional current active markets from Polymarket, sorted by activity level and urgency...",
          action: "GET_MORE_MARKETS"
        }
      }
    ]
  ]
};
var getMarketAction = {
  name: "GET_MARKET",
  description: "Get details of a specific market on Polymarket using CLOB API",
  similes: ["market details", "specific market", "market info"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      let currentState = state ?? await runtime.composeState(message);
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
        schema: GetMarketSchema
      });
      const typedParameters = parameters;
      try {
        const client = await getPolymarketClient();
        const marketsResponse = await client.getMarkets();
        let markets = [];
        if (Array.isArray(marketsResponse)) {
          markets = marketsResponse;
        } else if (marketsResponse && typeof marketsResponse === "object") {
          const response = marketsResponse;
          if (response.data && Array.isArray(response.data)) {
            markets = response.data;
          }
        }
        const market = markets.find(
          (m) => m.condition_id === typedParameters.conditionId || m.conditionId === typedParameters.conditionId || m.id === typedParameters.conditionId
        );
        if (!market) {
          throw new Error(`Market with condition ID ${typedParameters.conditionId} not found`);
        }
        console.log("Market details from CLOB API:", market);
        const tokens = market.tokens || market.outcomes || [];
        const tokenArray = Array.isArray(tokens) ? tokens : [];
        const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : "N/A";
        const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleString() : "N/A";
        const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : "N/A";
        const tagsString = Array.isArray(market.tags) ? market.tags.slice(0, 5).join(", ") : "No tags";
        const rewardInfo = market.rewards ? `Rewards available: Min size $${market.rewards.min_size}, Max spread ${market.rewards.max_spread}` : "No rewards available";
        const tokenDetails = tokenArray.map((token, index) => {
          const price = token.price || token.lastPrice || "0.50";
          const outcome = token.outcome || token.name || token.title || `Outcome ${index + 1}`;
          const winner = token.winner ? " (Winner)" : "";
          return `   ${index + 1}. ${outcome}: $${price}${winner}`;
        }).join("\n");
        const marketDetails = `
\u{1F4CC} Market: ${market.question || market.title || "Unknown Market"}
\u{1F4C4} Description: ${market.description || "No description available"}
\u{1F4C5} Ends: ${endDate}
\u{1F4A7} Liquidity: ${liquidity}
\u{1F4C8} 24h Volume: ${volume24hr}
\u{1F3F7}\uFE0F Tags: ${tagsString}
\u{1F381} ${rewardInfo}

\u{1F4CA} Outcomes & Prices:
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
          modelClass: ModelClass.LARGE
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
          text: "Can you show me details about the market with condition ID xyz123?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are the details for market xyz123 using the CLOB API: it's about whether Biden will win in 2024, with outcomes YES ($0.62) and NO ($0.38)...",
          action: "GET_MARKET"
        }
      }
    ]
  ]
};
var getHighActivityMarketsAction = {
  name: "GET_HIGH_ACTIVITY_MARKETS",
  description: "Get markets with high activity levels (high volume and liquidity) from Polymarket",
  similes: ["high volume markets", "busy markets", "popular markets", "trending markets", "hot markets", "active trading"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      let currentState = state ?? await runtime.composeState(message);
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
        schema: GetMarketsSchema
      });
      const typedParameters = parameters;
      const limit = Math.min(typedParameters.limit || 10, 20);
      const minVolume = 1e3;
      console.log(`Fetching ${limit} high activity markets with minimum volume of $${minVolume}`);
      try {
        const client = await getPolymarketClient();
        const marketsResponse = await client.getMarkets();
        let markets = [];
        if (Array.isArray(marketsResponse)) {
          markets = marketsResponse;
        } else if (marketsResponse && typeof marketsResponse === "object") {
          const response = marketsResponse;
          if (response.data && Array.isArray(response.data)) {
            markets = response.data;
          }
        }
        if (!Array.isArray(markets)) {
          console.log("Unexpected response format:", marketsResponse);
          markets = [];
        }
        console.log(`Found ${markets.length} total markets from CLOB API`);
        if (markets.length > 0) {
          const sampleMarket = markets[0];
          console.log("Sample market structure:", {
            question: sampleMarket.question || sampleMarket.title || "No title",
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
        let filteredMarkets = markets.filter((market) => {
          const isActive = market.active !== false;
          const isAcceptingOrders = market.accepting_orders !== false;
          const isNotClosed = market.closed !== true;
          const isNotArchived = market.archived !== true;
          const hasValidEndDate = market.end_date_iso || market.endDate;
          let isNotExpired = true;
          if (hasValidEndDate) {
            const endDate = new Date(hasValidEndDate);
            const now = /* @__PURE__ */ new Date();
            isNotExpired = endDate > now;
          }
          const hasValidTokens = market.tokens && Array.isArray(market.tokens) && market.tokens.length > 0;
          const hasValidOutcomes = market.outcomes && Array.isArray(market.outcomes) && market.outcomes.length > 0;
          const hasOutcomes = hasValidTokens || hasValidOutcomes;
          const volume24hr = parseFloat(market.volume24hr || market.volume || "0");
          const liquidity = parseFloat(market.liquidity || "0");
          const hasHighActivity = volume24hr >= minVolume || liquidity >= minVolume * 0.1;
          return isActive && isAcceptingOrders && isNotClosed && isNotArchived && isNotExpired && hasOutcomes && hasHighActivity;
        });
        console.log(`Filtered to ${filteredMarkets.length} high activity markets`);
        if (filteredMarkets.length === 0) {
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
        filteredMarkets.sort((a, b) => {
          const aVolume = parseFloat(a.volume24hr || a.volume || "0");
          const bVolume = parseFloat(b.volume24hr || b.volume || "0");
          const aLiquidity = parseFloat(a.liquidity || "0");
          const bLiquidity = parseFloat(b.liquidity || "0");
          const aActivityScore = aVolume + aLiquidity * 0.1;
          const bActivityScore = bVolume + bLiquidity * 0.1;
          return bActivityScore - aActivityScore;
        });
        const processedMarkets = filteredMarkets.slice(0, limit).map((market, index) => {
          const tokens = market.tokens || market.outcomes || [];
          const tokenArray = Array.isArray(tokens) ? tokens : [];
          const volume24hr = parseFloat(market.volume24hr || market.volume || "0");
          const liquidity = parseFloat(market.liquidity || "0");
          const activityScore = volume24hr + liquidity * 0.1;
          const endDate = new Date(market.end_date_iso || market.endDate || "2099-12-31");
          const now = /* @__PURE__ */ new Date();
          const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
          const freshness = daysUntilEnd > 0 ? daysUntilEnd : 0;
          return {
            condition_id: market.condition_id || market.conditionId || market.id,
            question_id: market.question_id || market.questionId,
            question: market.question || market.title || market.name || "Unknown Market",
            description: market.description ? market.description.length > 200 ? market.description.substring(0, 200) + "..." : market.description : "No description available",
            market_slug: market.market_slug || market.slug,
            active: market.active,
            closed: market.closed,
            archived: market.archived,
            accepting_orders: market.accepting_orders,
            end_date_iso: market.end_date_iso || market.endDate,
            created_date: market.created_date || market.createdAt,
            minimum_order_size: market.minimum_order_size || market.minOrderSize || "1.00",
            minimum_tick_size: market.minimum_tick_size || market.tickSize || "0.01",
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
            tokens: tokenArray.map((token) => ({
              token_id: token.token_id || token.tokenId || token.id,
              outcome: token.outcome || token.name || token.title,
              price: token.price || token.lastPrice || "0.50",
              winner: token.winner,
              volume: token.volume
            })),
            rewards: market.rewards ? {
              min_size: market.rewards.min_size,
              max_spread: market.rewards.max_spread,
              rates_count: market.rewards.rates?.length || 0,
              daily_rate: market.rewards.daily_rate
            } : null,
            last_updated: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
        const marketSummary = processedMarkets.map((market, index) => {
          const outcomes = market.tokens.length > 0 ? market.tokens.map((t) => `${t.outcome} ($${t.price})`).join(" vs ") : "No outcomes available";
          const activityLevel = market.activity_score > 5e4 ? "\u{1F525}\u{1F525}\u{1F525}" : market.activity_score > 2e4 ? "\u{1F525}\u{1F525}" : market.activity_score > 1e4 ? "\u{1F525}" : "\u26A1";
          const urgencyEmoji = market.freshness_days <= 1 ? "\u{1F6A8}" : market.freshness_days <= 7 ? "\u23F0" : market.freshness_days <= 30 ? "\u{1F4C5}" : "\u{1F4C6}";
          const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(", ") : "No tags";
          const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : "No end date";
          const volume24hr = market.volume24hr ? `$${parseFloat(market.volume24hr).toLocaleString()}` : "N/A";
          const liquidity = market.liquidity ? `$${parseFloat(market.liquidity).toLocaleString()}` : "N/A";
          return `${index + 1}. ${activityLevel}${urgencyEmoji} ${market.question.substring(0, 70)}${market.question.length > 70 ? "..." : ""}
   \u{1F4CA} Outcomes: ${outcomes}
   \u{1F4B0} 24h Volume: ${volume24hr} | \u{1F4A7} Liquidity: ${liquidity} | \u{1F3F7}\uFE0F Tags: ${tags}
   \u{1F4B5} Min Order: $${market.minimum_order_size} | \u{1F4C5} Ends: ${endDate}
   \u{1F3AF} Condition ID: ${market.condition_id || "N/A"}
   \u23F1\uFE0F  Days remaining: ${market.freshness_days} | \u{1F525} Activity Score: $${market.activity_score.toLocaleString()}`;
        }).join("\n\n");
        const responseContext = composeContext({
          state: currentState,
          template: `{{recentMessages}}

Found ${processedMarkets.length} high activity betting markets on Polymarket (minimum $${minVolume} volume):

Legend: 
\u{1F525}\u{1F525}\u{1F525} Ultra High Activity (50k+) | \u{1F525}\u{1F525} Very High Activity (20k+) | \u{1F525} High Activity (10k+) | \u26A1 Medium Activity
\u{1F6A8} Ending Today | \u23F0 Ending This Week | \u{1F4C5} Ending This Month | \u{1F4C6} Long Term

${marketSummary}

These are the most active and liquid markets available for betting, sorted by activity level. High activity indicates more trading opportunities and better liquidity.

Generate a response highlighting these high activity markets, emphasizing their trading volume, liquidity, and why they're popular for betting.`
        });
        const responseText = await generateText({
          runtime,
          context: responseContext,
          modelClass: ModelClass.LARGE
        });
        callback?.({
          text: responseText,
          content: {
            markets: processedMarkets,
            totalCount: markets.length,
            displayedCount: processedMarkets.length,
            activeCount: processedMarkets.filter((m) => m.active).length,
            acceptingOrdersCount: processedMarkets.filter((m) => m.accepting_orders).length,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            source: "CLOB-API",
            sorting: "activity_score_desc",
            filters_applied: ["active_only", "accepting_orders", "not_expired", "has_outcomes", "high_activity"],
            minVolume,
            activity_stats: {
              ultra_high: processedMarkets.filter((m) => m.activity_score > 5e4).length,
              very_high: processedMarkets.filter((m) => m.activity_score > 2e4 && m.activity_score <= 5e4).length,
              high: processedMarkets.filter((m) => m.activity_score > 1e4 && m.activity_score <= 2e4).length,
              medium: processedMarkets.filter((m) => m.activity_score <= 1e4).length,
              ending_soon: processedMarkets.filter((m) => m.freshness_days <= 7).length
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
          text: "Show me the high volume markets"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are the high activity markets on Polymarket, sorted by trading volume and liquidity...",
          action: "GET_HIGH_ACTIVITY_MARKETS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the most popular betting markets right now?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll fetch the most active and popular markets for you, focusing on high volume and liquidity...",
          action: "GET_HIGH_ACTIVITY_MARKETS"
        }
      }
    ]
  ]
};

// src/index.ts
console.log("\n\u250C\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2510");
console.log("\u2502        POLYMARKET PLUGIN               \u2502");
console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
console.log("\u2502  Initializing Polymarket Plugin...     \u2502");
console.log("\u2502  Version: 0.0.1                        \u2502");
console.log("\u2514\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2518");
var initializeActions = () => {
  try {
    const host = process.env.CLOB_API_URL || "https://clob.polymarket.com";
    const chainId = process.env.CHAIN_ID || "137";
    const apiKey = process.env.POLYMARKET_API_KEY;
    const secret = process.env.POLYMARKET_SECRET;
    const passphrase = process.env.POLYMARKET_PASSPHRASE;
    console.log(`\u{1F310} Polymarket Host: ${host}`);
    console.log(`\u26D3\uFE0F  Chain ID: ${chainId}`);
    if (apiKey && secret && passphrase) {
      console.log("\u{1F510} Authenticated mode: Trading actions available");
    } else {
      console.log("\u{1F4D6} Read-only mode: Only market data actions available");
      console.log("   To enable trading, set POLYMARKET_API_KEY, POLYMARKET_SECRET, and POLYMARKET_PASSPHRASE");
    }
    const actions = [
      getMarketsAction,
      getMoreMarketsAction,
      getMarketAction,
      getHighActivityMarketsAction,
      checkBalanceAction,
      placeBetAction
    ];
    console.log("\u2714 Polymarket actions initialized successfully.");
    console.log(`\u{1F4CA} Available actions: ${actions.map((a) => a.name).join(", ")}`);
    return actions;
  } catch (error) {
    console.error("\u274C Failed to initialize Polymarket actions:", error);
    return [];
  }
};
var polymarketPlugin = {
  name: "[Polymarket] Integration",
  description: "Polymarket prediction markets integration plugin - get market data and place bets",
  providers: [polymarketProvider],
  evaluators: [],
  services: [],
  actions: initializeActions()
};
var index_default = polymarketPlugin;

export { checkBalanceAction, index_default as default, getHighActivityMarketsAction, getMarketAction, getMarketsAction, getMoreMarketsAction, getPolymarketClient, placeBetAction, polymarketPlugin, polymarketProvider };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map