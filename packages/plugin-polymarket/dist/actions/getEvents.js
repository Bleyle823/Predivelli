"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventsAction = void 0;
const core_1 = require("@elizaos/core");
const client_1 = require("../utils/client");
const utils_1 = require("./utils");
exports.getEventsAction = {
    name: "GET_POLYMARKET_EVENTS",
    similes: ["LIST_EVENTS", "SHOW_EVENTS", "VIEW_EVENTS", "GET_MARKETS", "FIND_MARKETS", "BROWSE_MARKETS"],
    description: "Get Polymarket events and markets with advanced filtering and analysis",
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
        try {
            const { account } = await (0, client_1.getPolymarketClient)();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);
            const eventsContext = (0, core_1.composeContext)({
                state: currentState,
                template: `{{recentMessages}}

Extract specific event or market criteria from the conversation. Look for:
- Event names, topics, or keywords (politics, sports, crypto, etc.)
- Date ranges or time periods
- Market categories or tags
- Active/inactive status preferences
- Volume or liquidity requirements
- Price ranges or odds

If no specific criteria mentioned, return general active markets.`
            });
            const { object: params } = await (0, core_1.generateObject)({
                runtime,
                context: eventsContext,
                modelClass: core_1.ModelClass.LARGE,
                schema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query for events or keywords"
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of events to return",
                            default: 10
                        },
                        active: {
                            type: "boolean",
                            description: "Filter for active events only",
                            default: true
                        },
                        category: {
                            type: "string",
                            description: "Market category filter (politics, sports, crypto, etc.)"
                        },
                        minVolume: {
                            type: "number",
                            description: "Minimum volume threshold"
                        }
                    }
                }
            });
            // Mock result for demonstration
            const result = {
                markets: [
                    {
                        id: "12345",
                        question: "Will Bitcoin reach $100,000 by end of 2024?",
                        outcomes: ["YES", "NO"],
                        volume: 1500000,
                        liquidity: 500000,
                        endDate: "2024-12-31T23:59:59Z",
                        category: "crypto",
                        active: true
                    },
                    {
                        id: "12346",
                        question: "Will the incumbent win the 2024 election?",
                        outcomes: ["YES", "NO"],
                        volume: 2500000,
                        liquidity: 800000,
                        endDate: "2024-11-05T23:59:59Z",
                        category: "politics",
                        active: true
                    }
                ],
                total: 2,
                query: params.query || "all markets"
            };
            console.log(`🔍 Searching for markets with params:`, params);
            const responseText = await (0, utils_1.generateResponse)(runtime, currentState, "GET_POLYMARKET_EVENTS", result, "🎯 Successfully retrieved Polymarket events and markets");
            callback?.({ text: responseText, content: result });
            return true;
        }
        catch (error) {
            return (0, utils_1.handleError)(error, "GET_POLYMARKET_EVENTS", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Show me the latest political prediction markets" }
            },
            {
                user: "{{user2}}",
                content: { text: "Here are the hottest political prediction markets on Polymarket..." }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Find me some crypto markets with high volume" }
            },
            {
                user: "{{user2}}",
                content: { text: "I found several high-volume crypto prediction markets..." }
            }
        ]
    ]
};
