import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { getClobClient } from "../utils/client";
import { generateResponse, handleError } from "./utils";

export const cancelOrderAction: Action = {
    name: "CANCEL_ORDER",
    similes: ["CANCEL_TRADE", "REMOVE_ORDER", "DELETE_ORDER", "CANCEL_BET", "WITHDRAW_ORDER"],
    description: "Cancel an existing order on Polymarket",
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
            
            // Extract order ID from the message
            const orderId = extractOrderId(message.content.text || "");
            
            if (!orderId) {
                throw new Error("Order ID is required to cancel an order");
            }

            console.log(`❌ Cancelling order: ${orderId}`);
            
            // Cancel the order
            const cancelResult = await clobClient.cancelOrder({ orderID: orderId });

            const result = {
                success: true,
                orderId: orderId,
                cancelled: true,
                result: cancelResult
            };

            const responseText = `✅ Order cancelled successfully!
📊 Order ID: ${orderId}
🔄 Status: Cancelled`;

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
                content: { text: "Cancel order abc123" }
            },
            {
                user: "{{user2}}",
                content: { text: "✅ Order cancelled successfully! Order ID: abc123..." }
            }
        ]
    ]
};

// Helper function to extract order ID from text
function extractOrderId(text: string): string {
    // Look for order ID patterns (alphanumeric strings)
    const orderIdMatch = text.match(/([a-zA-Z0-9]{8,})/);
    return orderIdMatch ? orderIdMatch[1] : "";
} 