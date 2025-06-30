export interface PolymarketConfig {
    apiKey: string;
    apiSecret: string;
    apiPassphrase: string;
    walletPrivateKey: string;
    rpcProviderUrl: string;
}
export interface MarketData {
    id: string;
    question: string;
    outcomes: string[];
    volume: number;
    liquidity: number;
    endDate: string;
    category: string;
    active: boolean;
}
export interface OrderParams {
    tokenId: string;
    side: "BUY" | "SELL";
    amount: string;
    price: string;
    outcome?: "YES" | "NO";
    type?: "GTC" | "FOK" | "IOC";
    expiration?: number;
}
export interface PortfolioStats {
    address: string;
    balance: string;
    positions: any[];
    totalValue: number;
    pnl: number;
}
