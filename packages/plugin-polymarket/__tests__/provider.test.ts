import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPolymarketClient, walletProvider } from '../src/provider';
import { http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai';
import { polymarket } from '@goat-sdk/plugin-polymarket';
import { viem } from '@goat-sdk/wallet-viem';

// Mock dependencies
vi.mock('viem', () => ({
    http: vi.fn(),
    createWalletClient: vi.fn().mockImplementation(() => ({
        account: { address: '0x123...abc' }
    }))
}));

vi.mock('viem/accounts', () => ({
    privateKeyToAccount: vi.fn().mockImplementation(() => ({
        address: '0x123...abc'
    }))
}));

vi.mock('viem/chains', () => ({
    polygon: { id: 137 }
}));

vi.mock('@goat-sdk/adapter-vercel-ai', () => ({
    getOnChainTools: vi.fn().mockResolvedValue([
        {
            name: 'getEvents',
            execute: vi.fn().mockResolvedValue([{ id: '1', title: 'Test Event' }])
        },
        {
            name: 'getMarketInfo',
            execute: vi.fn().mockResolvedValue({ id: '1', title: 'Test Market' })
        },
        {
            name: 'createOrder',
            execute: vi.fn().mockResolvedValue({ orderId: '12345' })
        },
        {
            name: 'getOrders',
            execute: vi.fn().mockResolvedValue([{ id: '1', status: 'active' }])
        },
        {
            name: 'cancelOrder',
            execute: vi.fn().mockResolvedValue({ success: true })
        },
        {
            name: 'cancelAllOrders',
            execute: vi.fn().mockResolvedValue({ success: true })
        }
    ])
}));

vi.mock('@goat-sdk/plugin-polymarket', () => ({
    polymarket: vi.fn().mockImplementation(() => ({ plugin: 'polymarket' }))
}));

vi.mock('@goat-sdk/wallet-viem', () => ({
    viem: vi.fn().mockImplementation(() => ({ wallet: 'viem' }))
}));

describe('Polymarket Provider', () => {
    const mockRuntime = {
        name: 'test-runtime',
        memory: new Map(),
        getMemory: vi.fn(),
        setMemory: vi.fn(),
        clearMemory: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.POLYMARKET_API_KEY = 'b9b0f50b-584e-2260-fc98-90a65c28a4bd';
        process.env.POLYMARKET_SECRET = 'GiFNZ8cwl8WXiQC5aNkCY9CVVs9qZk1MnNl2Lwkmjy4=';
        process.env.POLYMARKET_PASSPHRASE = '0f4307732b3707cccbbc40b41b15d2b52adc55548d7f87504512adb8244ba58a';
        process.env.WALLET_PRIVATE_KEY = '0xf34cc7d6ebf0e9f2bd44031a288507b4c162729d37e41d8885c8aea6035ca1a5';
        process.env.RPC_PROVIDER_URL = 'https://polygon-rpc.com';
    });

    afterEach(() => {
        delete process.env.POLYMARKET_API_KEY;
        delete process.env.POLYMARKET_SECRET;
        delete process.env.POLYMARKET_PASSPHRASE;
        delete process.env.WALLET_PRIVATE_KEY;
        delete process.env.RPC_PROVIDER_URL;
    });

    describe('getPolymarketClient', () => {
        it('should create Polymarket client with valid credentials', async () => {
            const client = await getPolymarketClient();
            
            expect(privateKeyToAccount).toHaveBeenCalledWith('0x1234567890abcdef');
            expect(createWalletClient).toHaveBeenCalledWith({
                account: { address: '0x123...abc' },
                transport: expect.any(Function),
                chain: { id: 137 }
            });
            expect(getOnChainTools).toHaveBeenCalledWith({
                wallet: { wallet: 'viem' },
                plugins: [{ plugin: 'polymarket' }]
            });
            expect(client).toBeDefined();
            expect(client.tools).toHaveLength(6);
        });

        it('should throw error when missing API credentials', async () => {
            delete process.env.POLYMARKET_API_KEY;
            
            await expect(getPolymarketClient()).rejects.toThrow(
                'Missing required Polymarket API credentials'
            );
        });

        it('should throw error when missing wallet configuration', async () => {
            delete process.env.WALLET_PRIVATE_KEY;
            
            await expect(getPolymarketClient()).rejects.toThrow(
                'Missing required wallet configuration'
            );
        });

        it('should handle initialization errors gracefully', async () => {
            vi.mocked(getOnChainTools).mockRejectedValueOnce(
                new Error('Initialization failed')
            );

            await expect(getPolymarketClient()).rejects.toThrow(
                'Failed to initialize Polymarket client: Initialization failed'
            );
        });
    });

    describe('walletProvider', () => {
        it('should return wallet address', async () => {
            const result = await walletProvider.get(mockRuntime);
            expect(result).toBe('Polymarket Wallet Address: 0x123...abc');
        });

        it('should handle errors and return error message', async () => {
            vi.mocked(getOnChainTools).mockRejectedValueOnce(
                new Error('Configuration failed')
            );

            const result = await walletProvider.get(mockRuntime);
            expect(result).toBe('Error initializing Polymarket wallet: Configuration failed');
        });
    });
});
