"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPortfolioStatsAction = void 0;
const client_1 = require("../utils/client");
const utils_1 = require("./utils");
exports.getPortfolioStatsAction = {
    name: "GET_PORTFOLIO_STATS",
    similes: ["PORTFOLIO", "MY_PORTFOLIO", "PORTFOLIO_STATS", "ACCOUNT_STATS", "BALANCE", "POSITIONS"],
    description: "Get comprehensive portfolio statistics and performance metrics",
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
        try {
            const { tools } = await (0, client_1.getPolymarketClient)();
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);
            const portfolioTool = tools.find(tool => tool.name?.toLowerCase().includes('portfolio') ||
                tool.name?.toLowerCase().includes('balance') ||
                tool.name?.toLowerCase().includes('positions'));
            if (!portfolioTool) {
                throw new Error("❌ Portfolio stats tool not found in available tools");
            }
            console.log(`📊 Fetching portfolio statistics...`);
            const result = await portfolioTool.execute?.({}) || await portfolioTool.call?.({});
            const responseText = await (0, utils_1.generateResponse)(runtime, currentState, "GET_PORTFOLIO_STATS", result, "💰 Successfully retrieved your portfolio statistics and performance metrics");
            callback?.({ text: responseText, content: result });
            return true;
        }
        catch (error) {
            return (0, utils_1.handleError)(error, "GET_PORTFOLIO_STATS", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Show me my portfolio stats" }
            },
            {
                user: "{{user2}}",
                content: { text: "Here's your comprehensive portfolio overview..." }
            }
        ]
    ]
};
