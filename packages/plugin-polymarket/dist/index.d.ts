import * as _elizaos_core from '@elizaos/core';
import { Provider, Action, Plugin } from '@elizaos/core';
import { ClobClient } from '@polymarket/clob-client';

declare function getPolymarketClient(): Promise<ClobClient>;
declare const polymarketProvider: Provider;

declare const placeBetAction: Action;
declare const getMoreMarketsAction: Action;
declare const checkBalanceAction: Action;
declare const getMarketsAction: Action;
declare const getMarketAction: Action;
declare const polymarketActions: Action[];

declare const polymarketPlugin: Plugin;

declare function getPolymarketActions(): Promise<_elizaos_core.Action[]>;

export { checkBalanceAction, polymarketPlugin as default, getMarketAction, getMarketsAction, getMoreMarketsAction, getPolymarketActions, getPolymarketClient, placeBetAction, polymarketActions, polymarketPlugin, polymarketProvider };
