import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { getClobClient } from "../utils/client";
import { AssetType } from "@polymarket/clob-client";
import { generateResponse, handleError } from "./utils";

export const getPortfolioStatsAction: Action = {
    name: "GET_PORTFOLIO_STATS",
    similes: ["PORTFOLIO", "BALANCE", "POSITIONS", "ACCOUNT", "HOLDINGS", "PORTFOLIO_OVERVIEW"],
    description: "Get comprehensive portfolio statistics including balances, positions, and trading history",
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
            
            console.log(`📊 Getting portfolio statistics...`);
            
            // Get USDC balance and allowance
            const balanceAllowance = await clobClient.getBalanceAllowance({ 
                asset_type: AssetType.COLLATERAL 
            });
            
            // Get open orders
            const openOrders = await clobClient.getOpenOrders();
            
            // Get recent trades (last 50)
            const recentTrades = await clobClient.getTrades({}, true);
            
            // Get notifications
            const notifications = await clobClient.getNotifications();
            
            // Calculate portfolio metrics
            const totalOpenOrders = openOrders.length;
            const totalTrades = recentTrades.length;
            
            // Calculate total value of open orders
            let totalOrderValue = 0;
            openOrders.forEach((order: any) => {
                const orderValue = parseFloat(order.original_size) * parseFloat(order.price);
                totalOrderValue += orderValue;
            });
            
            // Calculate P&L from recent trades
            let totalPnL = 0;
            let totalVolume = 0;
            recentTrades.forEach((trade: any) => {
                const tradeValue = parseFloat(trade.size) * parseFloat(trade.price);
                totalVolume += tradeValue;
                // Simple P&L calculation (this could be enhanced)
                if (trade.side === 'BUY') {
                    totalPnL -= tradeValue;
                } else {
                    totalPnL += tradeValue;
                }
            });
            
            const result = {
                balance: {
                    usdc: balanceAllowance.balance,
                    allowance: balanceAllowance.allowance,
                    formatted: {
                        usdc: `${parseFloat(balanceAllowance.balance).toFixed(2)} USDC`,
                        allowance: `${parseFloat(balanceAllowance.allowance).toFixed(2)} USDC`
                    }
                },
                positions: {
                    openOrders: {
                        count: totalOpenOrders,
                        totalValue: totalOrderValue,
                        orders: openOrders
                    },
                    recentTrades: {
                        count: totalTrades,
                        totalVolume: totalVolume,
                        trades: recentTrades.slice(0, 10) // Show last 10 trades
                    }
                },
                performance: {
                    totalPnL: totalPnL,
                    totalVolume: totalVolume,
                    winRate: totalTrades > 0 ? (recentTrades.filter((t: any) => t.side === 'SELL').length / totalTrades * 100) : 0
                },
                notifications: {
                    count: notifications.length,
                    unread: notifications.filter((n: any) => !n.read).length,
                    recent: notifications.slice(0, 5) // Show last 5 notifications
                },
                summary: {
                    hasBalance: parseFloat(balanceAllowance.balance) > 0,
                    hasOpenOrders: totalOpenOrders > 0,
                    hasTradeHistory: totalTrades > 0,
                    hasNotifications: notifications.length > 0
                }
            };

            const responseText = `📊 Portfolio Overview:
💰 USDC Balance: ${result.balance.formatted.usdc}
🔓 USDC Allowance: ${result.balance.formatted.allowance}
📋 Open Orders: ${result.positions.openOrders.count} ($${result.positions.openOrders.totalValue.toFixed(2)})
📈 Recent Trades: ${result.positions.recentTrades.count}
💹 Total Volume: $${result.performance.totalVolume.toFixed(2)}
📊 P&L: $${result.performance.totalPnL.toFixed(2)}
🔔 Notifications: ${result.notifications.count} (${result.notifications.unread} unread)`;

            callback?.({ text: responseText, content: result });
            return true;
        } catch (error) {
            return handleError(error, "GET_PORTFOLIO_STATS", callback);
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
                content: { text: "📊 Portfolio Overview: 💰 USDC Balance: 100.00 USDC..." }
            }
        ]
    ]
}; 