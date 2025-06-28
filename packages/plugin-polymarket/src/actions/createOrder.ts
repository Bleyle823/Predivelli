import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { getClobClient } from "../utils/client";
import { Side, OrderType, AssetType } from "@polymarket/clob-client";
import { generateResponse, handleError } from "./utils";

export const createOrderAction: Action = {
    name: "CREATE_ORDER",
    similes: ["PLACE_ORDER", "BUY_ORDER", "SELL_ORDER", "TRADE", "MAKE_ORDER", "POST_ORDER"],
    description: "Create and place a new order on Polymarket",
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
            
            // Extract order parameters from the message
            const orderParams = extractOrderParams(message.content.text || "");
            
            if (!orderParams.tokenId) {
                throw new Error("Token ID is required to create an order");
            }

            console.log(`📊 Creating order with params:`, orderParams);
            
            // Check balance and allowance first
            const balanceAllowance = await clobClient.getBalanceAllowance({ 
                asset_type: AssetType.COLLATERAL 
            });
            
            console.log(`💰 USDC Balance: ${balanceAllowance.balance}`);
            console.log(`🔓 USDC Allowance: ${balanceAllowance.allowance}`);
            
            // Check if we need to update allowance
            const requiredAmount = orderParams.side === Side.BUY ? orderParams.amount * orderParams.price : orderParams.amount;
            const currentAllowance = parseFloat(balanceAllowance.allowance);
            
            if (currentAllowance < requiredAmount) {
                console.log("🔄 Updating USDC allowance...");
                await clobClient.updateBalanceAllowance({ 
                    asset_type: AssetType.COLLATERAL 
                });
                console.log("✅ Allowance updated successfully");
            }
            
            // Create the order
            const orderResult = await clobClient.createAndPostOrder(
                {
                    tokenID: orderParams.tokenId,
                    price: orderParams.price,
                    side: orderParams.side,
                    size: orderParams.amount,
                    feeRateBps: orderParams.feeRateBps || 0,
                    expiration: orderParams.expiration,
                    taker: orderParams.taker,
                    nonce: orderParams.nonce
                },
                { 
                    tickSize: orderParams.tickSize || "0.01", 
                    negRisk: orderParams.negRisk || false 
                },
                orderParams.orderType || OrderType.GTC
            );

            const result = {
                success: true,
                orderId: orderResult.orderID,
                transactionHashes: orderResult.transactionsHashes,
                status: orderResult.status,
                takingAmount: orderResult.takingAmount,
                makingAmount: orderResult.makingAmount,
                orderParams,
                balanceInfo: {
                    balance: balanceAllowance.balance,
                    allowance: balanceAllowance.allowance
                }
            };

            const responseText = `✅ Order created successfully!
📊 Order ID: ${result.orderId}
💰 Side: ${orderParams.side}
📈 Price: $${orderParams.price}
📦 Size: ${orderParams.amount}
🔄 Status: ${result.status}`;

            callback?.({ text: responseText, content: result });
            return true;
        } catch (error) {
            return handleError(error, "CREATE_ORDER", callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Buy 10 shares of market 12345 at $0.50" }
            },
            {
                user: "{{user2}}",
                content: { text: "✅ Order created successfully! Order ID: abc123..." }
            }
        ]
    ]
};

// Helper function to extract order parameters from text
function extractOrderParams(text: string): {
    tokenId: string;
    side: Side;
    amount: number;
    price: number;
    orderType?: OrderType;
    feeRateBps?: number;
    expiration?: number;
    taker?: string;
    nonce?: number;
    tickSize?: string;
    negRisk?: boolean;
} {
    const lowerText = text.toLowerCase();
    
    // Extract side
    let side: Side = Side.BUY;
    if (lowerText.includes('sell') || lowerText.includes('short')) {
        side = Side.SELL;
    }
    
    // Extract amount and price using regex
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:shares?|units?|amount)/i);
    const priceMatch = text.match(/\$(\d+(?:\.\d+)?)/);
    const tokenMatch = text.match(/(\d{10,})/); // Token IDs are typically long numbers
    
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 1;
    const price = priceMatch ? parseFloat(priceMatch[1]) : 0.5;
    const tokenId = tokenMatch ? tokenMatch[1] : "";
    
    // Extract order type
    let orderType: OrderType = OrderType.GTC;
    if (lowerText.includes('fok') || lowerText.includes('fill or kill')) {
        orderType = OrderType.FOK;
    } else if (lowerText.includes('fak') || lowerText.includes('fill and kill')) {
        orderType = OrderType.FAK;
    } else if (lowerText.includes('gtd') || lowerText.includes('good till date')) {
        orderType = OrderType.GTD;
    }
    
    return {
        tokenId,
        side,
        amount,
        price,
        orderType,
        tickSize: "0.01",
        negRisk: false
    };
} 