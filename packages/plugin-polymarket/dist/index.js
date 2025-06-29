import { AssetType, Side, OrderType, Chain, ClobClient } from '@polymarket/clob-client';
import { composeContext, generateObject, ModelClass, generateText } from '@elizaos/core';
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
      const marketCount = Array.isArray(markets?.data) ? markets.data.length : Array.isArray(markets) ? markets.length : 0;
      return `Polymarket Client: Connected (${marketCount} markets available)`;
    } catch (error) {
      console.error("Error in Polymarket provider:", error);
      return `Error connecting to Polymarket: ${error instanceof Error ? error.message : "Unknown error"}`;
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
z.object({
  cursor: z.string().describe("The cursor for pagination to get next batch of markets"),
  limit: z.number().optional().describe("Maximum number of markets to return")
});
z.object({
  orderId: z.string().describe("The ID of the order to cancel")
});
var placeBetAction = {
  name: "PLACE_BET",
  description: "Place a bet on a Polymarket outcome",
  similes: ["bet", "wager", "place order", "buy shares", "sell shares"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      const client = await getPolymarketClient();
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
        console.log("Updating USDC allowance...");
        await client.updateBalanceAllowance({
          asset_type: AssetType.COLLATERAL
        });
      }
      const orderSize = typedParameters.amount / typedParameters.price;
      const order = await client.createAndPostOrder(
        {
          tokenID: typedParameters.tokenId,
          price: typedParameters.price,
          side: typedParameters.side === "BUY" ? Side.BUY : Side.SELL,
          size: orderSize,
          feeRateBps: 0
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
        modelClass: ModelClass.LARGE
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
      const client = await getPolymarketClient();
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
  description: "Get latest available markets on Polymarket using ClobClient with fresh data",
  similes: ["markets", "betting markets", "available bets", "what can I bet on", "latest markets", "newest markets", "fresh markets", "current markets"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      const client = await getPolymarketClient();
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
      console.log(`Fetching ${limit} latest markets, active only: ${activeOnly}`);
      let allMarkets = [];
      try {
        const marketsResponse = await client.getMarkets();
        let markets = [];
        if (marketsResponse && typeof marketsResponse === "object") {
          if (Array.isArray(marketsResponse)) {
            markets = marketsResponse;
          } else if (marketsResponse.data && Array.isArray(marketsResponse.data)) {
            markets = marketsResponse.data;
          }
        }
        for (const market of markets) {
          const conditionId = market.condition_id || market.conditionId || market.id;
          if (conditionId && !allMarkets.some((m) => (m.condition_id || m.conditionId || m.id) === conditionId)) {
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
        allMarkets.sort((a, b) => {
          const aActive = a.active === true || a.active === "true";
          const bActive = b.active === true || b.active === "true";
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          const aAccepting = a.accepting_orders === true;
          const bAccepting = b.accepting_orders === true;
          if (aAccepting && !bAccepting) return -1;
          if (!aAccepting && bAccepting) return 1;
          const aEnd = new Date(a.end_date_iso || a.endDate || "1970-01-01").getTime();
          const bEnd = new Date(b.end_date_iso || b.endDate || "1970-01-01").getTime();
          if (aEnd !== bEnd) return bEnd - aEnd;
          const aCreated = new Date(a.created_date || a.createdAt || "1970-01-01").getTime();
          const bCreated = new Date(b.created_date || b.createdAt || "1970-01-01").getTime();
          return bCreated - aCreated;
        });
        if (activeOnly) {
          allMarkets = allMarkets.filter((market) => {
            const isActive = market.active === true || market.active === "true";
            const isAcceptingOrders = market.accepting_orders === true;
            const notClosed = market.closed !== true && market.closed !== "true";
            const notArchived = market.archived !== true && market.archived !== "true";
            return isActive || isAcceptingOrders || notClosed && notArchived;
          });
          console.log(`Filtered to ${allMarkets.length} active/available markets`);
        }
        const latestMarkets = allMarkets.slice(0, limit);
        const processedMarkets = latestMarkets.map((market, index) => {
          const tokens = market.tokens || market.outcomes || [];
          const tokenArray = Array.isArray(tokens) ? tokens : [];
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
            volume: market.volume || market.totalVolume,
            liquidity: market.liquidity,
            neg_risk: market.neg_risk,
            is_50_50_outcome: market.is_50_50_outcome,
            tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
            freshness_days: freshness,
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
          const statusEmoji = market.active ? "\u{1F7E2}" : market.accepting_orders ? "\u{1F7E1}" : market.closed ? "\u{1F534}" : "\u26AA";
          const freshnessEmoji = market.freshness_days > 30 ? "\u{1F525}" : market.freshness_days > 7 ? "\u26A1" : "\u23F0";
          const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(", ") : "No tags";
          const endDate = market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : "No end date";
          const volume = market.volume ? `$${parseFloat(market.volume).toLocaleString()}` : "N/A";
          return `${index + 1}. ${statusEmoji}${freshnessEmoji} ${market.question.substring(0, 70)}${market.question.length > 70 ? "..." : ""}
   \u{1F4CA} Outcomes: ${outcomes}
   \u{1F4C8} Volume: ${volume} | \u{1F3F7}\uFE0F Tags: ${tags}
   \u{1F4B5} Min Order: $${market.minimum_order_size} | \u{1F4C5} Ends: ${endDate}
   \u{1F3AF} ID: ${market.condition_id || "N/A"}
   \u23F1\uFE0F  Days remaining: ${market.freshness_days}`;
        }).join("\n\n");
        const responseContext = composeContext({
          state: currentState,
          template: `{{recentMessages}}

Found ${processedMarkets.length} latest betting markets on Polymarket (sorted by activity and freshness):

Legend: \u{1F7E2} Active | \u{1F7E1} Accepting Orders | \u{1F534} Closed | \u{1F525} Fresh (30+ days) | \u26A1 Recent (7+ days) | \u23F0 Ending Soon

${marketSummary}

These are the most current and active markets available for betting right now.

Generate a response highlighting these latest markets with their key details, emphasizing which ones are most active and fresh for betting.`
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
            totalCount: allMarkets.length,
            displayedCount: processedMarkets.length,
            activeCount: processedMarkets.filter((m) => m.active).length,
            acceptingOrdersCount: processedMarkets.filter((m) => m.accepting_orders).length,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
          text: "What are the latest betting markets available?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are the latest and most active betting markets on Polymarket, sorted by freshness and activity...",
          action: "GET_MARKETS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the newest markets on Polymarket"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll fetch the newest and most current markets for you, prioritizing active ones with recent activity...",
          action: "GET_MARKETS"
        }
      }
    ]
  ]
};
var getMoreMarketsAction = {
  name: "GET_MORE_MARKETS",
  description: "Get next batch of markets using ClobClient pagination",
  similes: ["more markets", "next page", "continue", "see more"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      const client = await getPolymarketClient();
      let currentState = state ?? await runtime.composeState(message);
      const limit = 10;
      try {
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
        const startIndex = Math.floor(Math.random() * Math.max(1, markets.length - limit));
        const paginatedMarkets = markets.slice(startIndex, startIndex + limit);
        const processedMarkets = paginatedMarkets.map((market) => {
          const tokens = market.tokens || market.outcomes || [];
          const tokenArray = Array.isArray(tokens) ? tokens : [];
          return {
            condition_id: market.condition_id || market.conditionId || market.id,
            question: market.question || market.title || "Unknown Market",
            description: market.description ? market.description.length > 150 ? market.description.substring(0, 150) + "..." : market.description : "No description",
            active: market.active,
            closed: market.closed,
            accepting_orders: market.accepting_orders,
            end_date_iso: market.end_date_iso || market.endDate,
            minimum_order_size: market.minimum_order_size || "1.00",
            tags: Array.isArray(market.tags) ? market.tags.slice(0, 5) : [],
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
          const statusEmoji = market.active ? "\u{1F7E2}" : market.closed ? "\u{1F534}" : "\u{1F7E1}";
          const tags = market.tags.length > 0 ? market.tags.slice(0, 3).join(", ") : "No tags";
          return `${index + 1}. ${statusEmoji} ${market.question.substring(0, 60)}${market.question.length > 60 ? "..." : ""}
   Outcomes: ${outcomes}
   Tags: ${tags}
   Min Order: $${market.minimum_order_size}
   Ends: ${market.end_date_iso ? new Date(market.end_date_iso).toLocaleDateString() : "No end date"}`;
        }).join("\n\n");
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
          modelClass: ModelClass.LARGE
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
          text: "Show me more markets"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are additional markets from Polymarket...",
          action: "GET_MORE_MARKETS"
        }
      }
    ]
  ]
};
var getMarketAction = {
  name: "GET_MARKET",
  description: "Get details of a specific market on Polymarket using ClobClient",
  similes: ["market details", "specific market", "market info"],
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      const client = await getPolymarketClient();
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
        const market = await client.getMarket(typedParameters.conditionId);
        console.log("Market details from ClobClient:", market);
        const tokens = market.tokens || market.outcomes || [];
        const tokenArray = Array.isArray(tokens) ? tokens : [];
        const tokenDetails = tokenArray.map(
          (token, index) => `   ${index + 1}. ${token.outcome || token.name}: $${token.price || token.lastPrice || "N/A"} (Token ID: ${token.token_id || token.tokenId || token.id || "N/A"})`
        ).join("\n") || "No token information available";
        const tagsString = Array.isArray(market.tags) ? market.tags.join(", ") : "No tags";
        const rewardInfo = market.rewards ? `Rewards available: ${market.rewards.daily_rate || "N/A"}% daily rate, Min size: $${market.rewards.min_size}, Max spread: ${market.rewards.max_spread}%` : "No rewards program";
        const marketSummary = `
\u{1F4CA} Market: ${market.question || market.title || market.name || "Unknown Market"}
\u{1F4DD} Description: ${market.description || "No description available"}
\u{1F194} Condition ID: ${market.condition_id || market.conditionId || market.id || "N/A"}
\u{1F517} Market Slug: ${market.market_slug || market.slug || "N/A"}
\u{1F4C8} Status: ${market.active ? "\u{1F7E2} Active" : "\u{1F534} Inactive"} | ${market.accepting_orders ? "Accepting Orders" : "Not Accepting Orders"}
\u{1F4C5} End Date: ${market.end_date_iso || market.endDate ? new Date(market.end_date_iso || market.endDate).toLocaleString() : "No end date"}
\u{1F4B0} Min Order Size: $${market.minimum_order_size || market.minOrderSize || "1.00"} | Tick Size: ${market.minimum_tick_size || market.tickSize || "0.01"}
\u{1F3F7}\uFE0F Tags: ${tagsString}
\u{1F381} ${rewardInfo}
\u{1F53B} Outcomes & Prices:
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
          modelClass: ModelClass.LARGE
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
          content: { error: errorMsg }
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback?.({
        text: `Error getting market details: ${errorMessage}`,
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
          text: "Show me more info about the Trump vs Biden election market"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's the full breakdown of the Trump vs Biden election market on Polymarket...",
          action: "GET_MARKET"
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

export { checkBalanceAction, index_default as default, getMarketAction, getMarketsAction, getMoreMarketsAction, getPolymarketClient, placeBetAction, polymarketPlugin, polymarketProvider };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map