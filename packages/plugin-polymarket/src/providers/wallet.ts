import type { Provider, IAgentRuntime } from "@elizaos/core";
import { getPolymarketClient, formatBalance } from "../utils/client";

export const walletProvider: Provider = {
    name: "polymarket-wallet",
    async get(runtime: IAgentRuntime): Promise<string> {
        try {
            const { wallet, address, balance, credentials, clobClient } = await getPolymarketClient();
            
            // Get additional wallet information
            const provider = wallet.provider;
            const network = await provider?.getNetwork();
            const chainId = network?.chainId || 'Unknown';
            
            // Get USDC balance and allowance if possible
            let usdcInfo = null;
            try {
                const balanceAllowance = await clobClient.getBalanceAllowance();
                usdcInfo = {
                    balance: balanceAllowance.balance,
                    allowance: balanceAllowance.allowance
                };
            } catch (error) {
                console.warn("Could not fetch USDC balance:", error);
            }
            
            const walletInfo = {
                address: address,
                balance: {
                    matic: formatBalance(balance),
                    usdc: usdcInfo
                },
                network: {
                    name: chainId === 137 ? "Polygon Mainnet" : chainId === 80002 ? "Polygon Amoy" : "Unknown",
                    chainId: chainId
                },
                status: "Connected",
                hasApiCredentials: !!credentials,
                timestamp: new Date().toISOString()
            };
            
            return JSON.stringify(walletInfo, null, 2);
        } catch (error) {
            console.error("🚨 Error in Polymarket wallet provider:", error);
            const errorInfo = {
                error: error instanceof Error ? error.message : "Unknown error",
                status: "Failed to connect",
                timestamp: new Date().toISOString()
            };
            return JSON.stringify(errorInfo, null, 2);
        }
    },
}; 