import type { Provider, IAgentRuntime } from "@elizaos/core";
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";
import { JsonRpcProvider } from "ethers";

export interface PolymarketClientConfig {
    host: string;
    chainId: number;
    privateKey?: string;
    rpcUrl?: string;
}

export class PolymarketService {
    private clobClient: ClobClient;
    private wallet?: Wallet;
    private provider?: JsonRpcProvider;
    private config: PolymarketClientConfig;

    constructor(config: PolymarketClientConfig) {
        this.config = config;
        this.clobClient = new ClobClient(config.host, config.chainId);
        
        if (config.privateKey && config.rpcUrl) {
            this.provider = new JsonRpcProvider(config.rpcUrl);
            this.wallet = new Wallet(config.privateKey, this.provider);
        }
    }

    // Market Data Methods
    async getMarkets(options?: { active?: boolean; limit?: number; offset?: number }) {
        try {
            const response = await this.clobClient.getMarkets();
            let markets = response?.data || response || [];
            
            if (options?.active !== undefined) {
                markets = markets.filter(market => market.active === options.active);
            }
            
            if (options?.limit) {
                markets = markets.slice(options.offset || 0, (options.offset || 0) + options.limit);
            }
            
            return markets;
        } catch (error) {
            console.error('Error fetching markets:', error);
            throw new Error(`Failed to fetch markets: ${error.message}`);
        }
    }

    async getSimplifiedMarkets(options?: { active?: boolean; limit?: number }) {
        try {
            const response = await this.clobClient.getSimplifiedMarkets();
            let markets = response?.data || response || [];
            
            if (options?.active !== undefined) {
                markets = markets.filter(market => market.active === options.active);
            }
            
            if (options?.limit) {
                markets = markets.slice(0, options.limit);
            }
            
            return markets;
        } catch (error) {
            console.error('Error fetching simplified markets:', error);
            throw new Error(`Failed to fetch simplified markets: ${error.message}`);
        }
    }

    async getMarket(conditionId: string) {
        try {
            return await this.clobClient.getMarket(conditionId);
        } catch (error) {
            console.error(`Error fetching market ${conditionId}:`, error);
            throw new Error(`Failed to fetch market: ${error.message}`);
        }
    }

    async getSamplingMarkets(limit?: number) {
        try {
            const response = await this.clobClient.getSamplingMarkets();
            let markets = response?.data || response || [];
            
            if (limit) {
                markets = markets.slice(0, limit);
            }
            
            return markets;
        } catch (error) {
            console.error('Error fetching sampling markets:', error);
            throw new Error(`Failed to fetch sampling markets: ${error.message}`);
        }
    }

    // Order Management Methods (requires wallet)
    async getOrders(marketId?: string) {
        if (!this.wallet) {
            throw new Error("Wallet required for order operations");
        }
        
        try {
            const address = await this.wallet.getAddress();
            return await this.clobClient.getOrders({ maker: address, market: marketId });
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }
    }

    async createOrder(params: {
        tokenId: string;
        price: string;
        size: string;
        side: 'BUY' | 'SELL';
        feeRateBps?: number;
        nonce?: number;
        expiration?: number;
    }) {
        if (!this.wallet) {
            throw new Error("Wallet required for creating orders");
        }

        try {
            const address = await this.wallet.getAddress();
            const orderParams = {
                tokenID: params.tokenId,
                price: params.price,
                size: params.size,
                side: params.side,
                feeRateBps: params.feeRateBps || 0,
                nonce: params.nonce || Date.now(),
                expiration: params.expiration || Math.floor(Date.now() / 1000) + 86400, // 24 hours
                maker: address,
                taker: "0x0000000000000000000000000000000000000000"
            };

            // Sign the order
            const signature = await this.clobClient.createOrder(orderParams, this.wallet);
            return signature;
        } catch (error) {
            console.error('Error creating order:', error);
            throw new Error(`Failed to create order: ${error.message}`);
        }
    }

    async cancelOrder(orderId: string) {
        if (!this.wallet) {
            throw new Error("Wallet required for canceling orders");
        }

        try {
            return await this.clobClient.cancelOrder(orderId, this.wallet);
        } catch (error) {
            console.error(`Error canceling order ${orderId}:`, error);
            throw new Error(`Failed to cancel order: ${error.message}`);
        }
    }

    async cancelAllOrders(marketId?: string) {
        if (!this.wallet) {
            throw new Error("Wallet required for canceling orders");
        }

        try {
            return await this.clobClient.cancelAll(this.wallet, marketId);
        } catch (error) {
            console.error('Error canceling all orders:', error);
            throw new Error(`Failed to cancel all orders: ${error.message}`);
        }
    }

    // Portfolio and Balance Methods
    async getPortfolio() {
        if (!this.wallet) {
            throw new Error("Wallet required for portfolio operations");
        }

        try {
            const address = await this.wallet.getAddress();
            return await this.clobClient.getPortfolio(address);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            throw new Error(`Failed to fetch portfolio: ${error.message}`);
        }
    }

    async getBalances() {
        if (!this.wallet) {
            throw new Error("Wallet required for balance operations");
        }

        try {
            const address = await this.wallet.getAddress();
            return await this.clobClient.getBalances(address);
        } catch (error) {
            console.error('Error fetching balances:', error);
            throw new Error(`Failed to fetch balances: ${error.message}`);
        }
    }

    // Utility Methods
    getWalletAddress(): string | null {
        return this.wallet?.address || null;
    }

    isWalletConnected(): boolean {
        return !!this.wallet;
    }
}

// Singleton instance
let polymarketService: PolymarketService | null = null;

export function getPolymarketService(): PolymarketService {
    if (!polymarketService) {
        const host = process.env.CLOB_API_URL || process.env.POLYMARKET_API_URL || "https://clob.polymarket.com";
        const chainId = parseInt(process.env.CHAIN_ID || "137");
        const privateKey = process.env.WALLET_PRIVATE_KEY || process.env.POLYMARKET_PRIVATE_KEY;
        const rpcUrl = process.env.RPC_PROVIDER_URL || process.env.POLYGON_RPC_URL;

        polymarketService = new PolymarketService({
            host,
            chainId,
            privateKey,
            rpcUrl
        });
    }
    
    return polymarketService;
}

export const walletProvider: Provider = {
    async get(runtime: IAgentRuntime): Promise<string | null> {
        try {
            const service = getPolymarketService();
            const address = service.getWalletAddress();
            
            if (address) {
                return `Polymarket Wallet Address: ${address}`;
            } else {
                return "Polymarket service initialized (read-only mode - no wallet configured)";
            }
        } catch (error) {
            console.error("Error in Polymarket provider:", error);
            return `Error initializing Polymarket service: ${error.message}`;
        }
    },
};