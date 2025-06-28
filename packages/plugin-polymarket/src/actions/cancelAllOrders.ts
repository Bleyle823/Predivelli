import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { getPolymarketClient } from "../utils/client";
import { generateResponse, handleError } from "./utils";

export const cancelAllOrdersAction: Action = {
    name: "CANCEL_ALL_ORDERS",
    similes: ["CANCEL_ALL", "REMOVE_ALL_ORDERS", "DELETE_ALL_ORDERS", "CLEAR_ORDERS"],
    description: "Cancel all active orders for the connected wallet",
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const { tools } = await getPolymarketClient();
            
            let currentState = state ?? (await runtime.composeState(message));
            currentState = await runtime.updateRecentMessageState(currentState);

            const cancelAllTool = tools.find(tool => 
                tool.name?.toLowerCase().includes('cancel') &&
                tool.name?.toLowerCase().includes('all')
            );

            if (!cancelAllTool) {
                throw new Error("❌ Cancel all orders tool not found in available tools");
            }

            console.log(`🗑️ Cancelling all active orders...`);
            const result = await cancelAllTool.execute?.({}) || await cancelAllTool.call?.({});

            const responseText = await generateResponse(
                runtime,
                currentState,
                "CANCEL_ALL_ORDERS",
                result,
                "✅ All active orders have been successfully cancelled!"
            );

            callback?.({ text: responseText, content: result });
            return true;
        } catch (error) {
            return handleError(error, "CANCEL_ALL_ORDERS", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Cancel all my orders" }
            },
            {
                user: "{{user2}}",
                content: { text: "✅ All your active orders have been cancelled successfully" }
            }
        ]
    ]
}; 