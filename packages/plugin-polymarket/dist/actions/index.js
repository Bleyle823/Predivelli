"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polymarketActions = void 0;
const getEvents_1 = require("./getEvents");
const getMarketInfo_1 = require("./getMarketInfo");
const createOrder_1 = require("./createOrder");
const getActiveOrders_1 = require("./getActiveOrders");
const cancelOrder_1 = require("./cancelOrder");
const cancelAllOrders_1 = require("./cancelAllOrders");
const getPortfolioStats_1 = require("./getPortfolioStats");
exports.polymarketActions = [
    getEvents_1.getEventsAction,
    getMarketInfo_1.getMarketInfoAction,
    createOrder_1.createOrderAction,
    getActiveOrders_1.getActiveOrdersAction,
    cancelOrder_1.cancelOrderAction,
    cancelAllOrders_1.cancelAllOrdersAction,
    getPortfolioStats_1.getPortfolioStatsAction
];
