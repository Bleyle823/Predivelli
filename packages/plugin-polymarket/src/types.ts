import { 
    Chain, 
    Side, 
    OrderType, 
    AssetType, 
    UserOrder, 
    UserMarketOrder,
    OpenOrder,
    Trade,
    OrderBookSummary,
    MarketPrice,
    Notification,
    BalanceAllowanceResponse,
    PaginationPayload,
    MarketTradeEvent,
    ApiKeyCreds,
    ApiKeysResponse,
    BanStatus,
    OrderScoring,
    OrdersScoring,
    TickSize,
    NegRisk,
    UserEarning,
    TotalUserEarning,
    MarketReward,
    UserRewardsEarning,
    RewardsPercentages
} from "@polymarket/clob-client";

// Configuration interfaces
export interface PolymarketConfig {
    privateKey: string;
    chainId: Chain;
    host?: string;
    rpcUrl?: string;
    funderAddress?: string;
    signatureType?: number;
    geoBlockToken?: string;
    useServerTime?: boolean;
}

export interface PolymarketCredentials {
    apiKey?: string;
    apiSecret?: string;
    apiPassphrase?: string;
}

// Enhanced market data interfaces
export interface MarketData {
    id: string;
    conditionId: string;
    question: string;
    description?: string;
    outcomes: MarketOutcome[];
    volume: number;
    liquidity: number;
    endDate: string;
    category: string;
    active: boolean;
    slug: string;
    image?: string;
    eventSlug?: string;
    rewardsConfig?: any[];
}

export interface MarketOutcome {
    id: string;
    name: string;
    tokenId: string;
    price: number;
    volume?: number;
}

export interface MarketInfo {
    market: MarketData;
    orderBook: OrderBookSummary;
    tickSize: TickSize;
    negRisk: boolean;
    lastTradePrice?: number;
    spread?: number;
    midpoint?: number;
}

// Trading interfaces
export interface OrderParams {
    tokenId: string;
    side: Side;
    amount: number;
    price?: number;
    orderType?: OrderType;
    feeRateBps?: number;
    expiration?: number;
    taker?: string;
    nonce?: number;
}

export interface MarketOrderParams {
    tokenId: string;
    side: Side;
    amount: number;
    price?: number;
    orderType?: OrderType.FOK | OrderType.FAK;
    feeRateBps?: number;
    taker?: string;
    nonce?: number;
}

export interface OrderResult {
    success: boolean;
    orderId?: string;
    transactionHashes?: string[];
    status: string;
    takingAmount?: string;
    makingAmount?: string;
    error?: string;
}

// Portfolio and balance interfaces
export interface PortfolioStats {
    address: string;
    balance: BalanceAllowanceResponse;
    positions: Position[];
    totalValue: number;
    pnl: number;
    openOrders: OpenOrder[];
    recentTrades: Trade[];
}

export interface Position {
    tokenId: string;
    market: string;
    outcome: string;
    size: string;
    averagePrice: number;
    currentValue: number;
    unrealizedPnl: number;
}

export interface BalanceInfo {
    usdcBalance: string;
    usdcAllowance: string;
    conditionalTokens: ConditionalTokenBalance[];
}

export interface ConditionalTokenBalance {
    tokenId: string;
    market: string;
    outcome: string;
    balance: string;
    value: number;
}

// Analytics and reporting interfaces
export interface TradingAnalytics {
    totalTrades: number;
    totalVolume: number;
    winRate: number;
    averageTradeSize: number;
    bestTrade: Trade;
    worstTrade: Trade;
    profitLoss: number;
    feesPaid: number;
}

export interface MarketAnalytics {
    marketId: string;
    volume24h: number;
    priceChange24h: number;
    liquidityDepth: number;
    spreadAnalysis: SpreadAnalysis;
    orderFlow: OrderFlowData;
}

export interface SpreadAnalysis {
    currentSpread: number;
    averageSpread: number;
    spreadTrend: 'increasing' | 'decreasing' | 'stable';
    bestBid: number;
    bestAsk: number;
}

export interface OrderFlowData {
    buyVolume: number;
    sellVolume: number;
    buyOrders: number;
    sellOrders: number;
    imbalance: number;
}

// Notification and alerts
export interface AlertConfig {
    priceAlerts: PriceAlert[];
    volumeAlerts: VolumeAlert[];
    balanceAlerts: BalanceAlert[];
}

export interface PriceAlert {
    tokenId: string;
    targetPrice: number;
    direction: 'above' | 'below';
    active: boolean;
}

export interface VolumeAlert {
    tokenId: string;
    threshold: number;
    timeframe: '1h' | '24h' | '7d';
    active: boolean;
}

export interface BalanceAlert {
    minBalance: number;
    active: boolean;
}

// Rewards and earnings
export interface RewardsInfo {
    totalEarnings: number;
    currentRewards: MarketReward[];
    earningsHistory: UserEarning[];
    rewardPercentages: RewardsPercentages;
}

// Error handling
export interface PolymarketError {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
}

// API response wrappers
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: PolymarketError;
    timestamp: string;
}

// Real-time data interfaces
export interface RealTimeData {
    marketUpdates: MarketUpdate[];
    orderUpdates: OrderUpdate[];
    tradeUpdates: TradeUpdate[];
}

export interface MarketUpdate {
    marketId: string;
    price: number;
    volume: number;
    timestamp: number;
}

export interface OrderUpdate {
    orderId: string;
    status: string;
    filledAmount: string;
    timestamp: number;
}

export interface TradeUpdate {
    tradeId: string;
    price: number;
    size: number;
    side: Side;
    timestamp: number;
} 