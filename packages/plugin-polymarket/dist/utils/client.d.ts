import { type WalletClient } from "viem";
import { type Account } from "viem/accounts";
export declare function getPolymarketClient(): Promise<{
    walletClient: WalletClient;
    account: Account;
    balance: bigint;
}>;
export declare function resetClient(): void;
