import { getMarketsAction } from "./getMarkets";
import { getMarketInfoAction } from "./getMarketInfo";
import { createOrderAction } from "./createOrder";
import { getActiveOrdersAction } from "./getActiveOrders";
import { cancelOrderAction } from "./cancelOrder";
import { cancelAllOrdersAction } from "./cancelAllOrders";
import { getPortfolioStatsAction } from "./getPortfolioStats";
import { getEventsAction } from "./getEvents";

export const polymarketActions = [
    getMarketsAction,
    getMarketInfoAction,
    createOrderAction,
    getActiveOrdersAction,
    cancelOrderAction,
    cancelAllOrdersAction,
    getPortfolioStatsAction,
    getEventsAction
]; 