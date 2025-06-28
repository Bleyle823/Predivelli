import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { getClobClient } from "../utils/client";
import { generateResponse, handleError } from "./utils";

export const getActiveOrdersAction: Action = {
    name: "GET_ACTIVE_ORDERS",
    similes: ["OPEN_ORDERS", "PENDING_ORDERS", "ACTIVE_TRADES", "MY_ORDERS", "ORDER_LIST", "PENDING_TRADES"],
    description: "Get all active/open orders for the current user",
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
            
            console.log(`📋 Getting active orders...`);
            
            // Get open orders
            const openOrders = await clobClient.getOpenOrders();
            
            // Calculate order statistics
            const totalOrders = openOrders.length;
            let totalValue = 0;
            let buyOrders = 0;
            let sellOrders = 0;
            
            openOrders.forEach((order: any) => {
                const orderValue = parseFloat(order.original_size) * parseFloat(order.price);
                totalValue += orderValue;
                
                if (order.side === 'BUY') {
                    buyOrders++;
                } else {
                    sellOrders++;
                }
            });
            
            const result = {
                orders: openOrders,
                summary: {
                    total: totalOrders,
                    buyOrders: buyOrders,
                    sellOrders: sellOrders,
                    totalValue: totalValue,
                    averageValue: totalOrders > 0 ? totalValue / totalOrders : 0
                },
                formatted: {
                    totalOrders: `${totalOrders} orders`,
                    totalValue: `$${totalValue.toFixed(2)}`,
                    buyOrders: `${buyOrders} buy orders`,
                    sellOrders: `${sellOrders} sell orders`
                }
            };

            const responseText = `📋 Active Orders Summary:
📊 Total Orders: ${result.formatted.totalOrders}
💰 Total Value: ${result.formatted.totalValue}
📈 Buy Orders: ${result.formatted.buyOrders}
📉 Sell Orders: ${result.formatted.sellOrders}

${totalOrders === 0 ? "No active orders found." : "Order details available in the response."}`;

            callback?.({ text: responseText, content: result });
            return true;
        } catch (error) {
            return handleError(error, "GET_ACTIVE_ORDERS", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Show my active orders" }
            },
            {
                user: "{{user2}}",
                content: { text: "📋 Active Orders Summary: 📊 Total Orders: 5 orders..." }
            }
        ]
    ]
}; 