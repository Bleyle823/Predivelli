import { describe, it, expect, vi, beforeEach } from 'vitest';
import polymarketPlugin from '../index';
import { getPolymarketClient, isPolymarketConfigured, getWalletAddress } from '../actions';

// Mock the actions
vi.mock('../actions', () => ({
    getPolymarketClient: vi.fn(),
    isPolymarketConfigured: vi.fn(),
    getWalletAddress: vi.fn()
}));

describe('Polymarket Plugin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should have correct plugin structure', () => {
        expect(polymarketPlugin).toBeDefined();
        expect(polymarketPlugin.name).toBe("[Polymarket] Integration");
        expect(polymarketPlugin.description).toBe("Polymarket prediction market integration plugin");
        expect(Array.isArray(polymarketPlugin.providers)).toBe(true);
        expect(Array.isArray(polymarketPlugin.evaluators)).toBe(true);
        expect(Array.isArray(polymarketPlugin.services)).toBe(true);
        expect(Array.isArray(polymarketPlugin.actions)).toBe(true);
        expect(typeof polymarketPlugin.handlePostCharacterLoaded).toBe('function');
    });

    it('should have wallet provider', () => {
        expect(polymarketPlugin.providers?.length).toBeGreaterThan(0);
        expect(polymarketPlugin.providers?.[0]).toBeDefined();
    });

    it('should handle character loading', async () => {
        const mockCharacter = {
            name: "TestBot",
            bio: "Test bot",
            lore: [],
            settings: {
                secrets: {
                    POLYMARKET_API_KEY: "test-key",
                    POLYMARKET_SECRET: "test-secret",
                    POLYMARKET_PASSPHRASE: "test-passphrase",
                    WALLET_PRIVATE_KEY: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                    RPC_PROVIDER_URL: "https://polygon-rpc.com"
                }
            }
        } as any;

        const result = await polymarketPlugin.handlePostCharacterLoaded!(mockCharacter);
        
        expect(result).toBe(mockCharacter);
        expect(polymarketPlugin.actions?.length).toBeGreaterThan(0);
    });

    it('should handle missing credentials gracefully', async () => {
        const mockCharacter = {
            name: "TestBot",
            bio: "Test bot",
            lore: [],
            settings: {
                secrets: {}
            }
        } as any;

        const result = await polymarketPlugin.handlePostCharacterLoaded!(mockCharacter);
        
        expect(result).toBe(mockCharacter);
        expect(polymarketPlugin.actions?.length).toBe(0);
    });

    describe('Plugin Actions', () => {
        const mockRuntime = {
            getSetting: vi.fn().mockReturnValue("test-value"),
            composeState: vi.fn().mockResolvedValue({
                recentMessages: "Test message",
                knowledge: "",
                bio: "Test bio",
                lore: [],
                providers: [],
                attachments: [],
                actions: [],
                actionExamples: []
            }),
            updateRecentMessageState: vi.fn().mockImplementation((state) => Promise.resolve(state)),
            modelProvider: "openai",
            token: "test-token",
            character: {
                name: "TestBot",
                bio: "Test bot",
                lore: []
            }
        } as any;

        const mockMessage = {
            id: "test-id",
            content: { text: "Test message" },
            userId: "test-user",
            roomId: "test-room",
            timestamp: new Date(),
            source: "test"
        } as any;

        const mockCallback = vi.fn();

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should have GET_POLYMARKET_STATUS action', async () => {
            // Initialize the plugin first
            const mockCharacter = {
                name: "TestBot",
                bio: "Test bot",
                lore: [],
                settings: {
                    secrets: {
                        POLYMARKET_API_KEY: "test-key",
                        POLYMARKET_SECRET: "test-secret",
                        POLYMARKET_PASSPHRASE: "test-passphrase",
                        WALLET_PRIVATE_KEY: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                        RPC_PROVIDER_URL: "https://polygon-rpc.com"
                    }
                }
            } as any;

            await polymarketPlugin.handlePostCharacterLoaded!(mockCharacter);
            
            const statusAction = polymarketPlugin.actions?.find(a => a.name === 'GET_POLYMARKET_STATUS');
            expect(statusAction).toBeDefined();
            expect(statusAction?.description).toBe("Check Polymarket connection status and wallet information");
        });

        it('should have GET_POLYMARKET_TOOLS action', async () => {
            // Initialize the plugin first
            const mockCharacter = {
                name: "TestBot",
                bio: "Test bot",
                lore: [],
                settings: {
                    secrets: {
                        POLYMARKET_API_KEY: "test-key",
                        POLYMARKET_SECRET: "test-secret",
                        POLYMARKET_PASSPHRASE: "test-passphrase",
                        WALLET_PRIVATE_KEY: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                        RPC_PROVIDER_URL: "https://polygon-rpc.com"
                    }
                }
            } as any;

            await polymarketPlugin.handlePostCharacterLoaded!(mockCharacter);
            
            const toolsAction = polymarketPlugin.actions?.find(a => a.name === 'GET_POLYMARKET_TOOLS');
            expect(toolsAction).toBeDefined();
            expect(toolsAction?.description).toBe("List all available Polymarket tools and their capabilities");
        });

        it('should validate all actions successfully', async () => {
            // Initialize the plugin first
            const mockCharacter = {
                name: "TestBot",
                bio: "Test bot",
                lore: [],
                settings: {
                    secrets: {
                        POLYMARKET_API_KEY: "test-key",
                        POLYMARKET_SECRET: "test-secret",
                        POLYMARKET_PASSPHRASE: "test-passphrase",
                        WALLET_PRIVATE_KEY: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                        RPC_PROVIDER_URL: "https://polygon-rpc.com"
                    }
                }
            } as any;

            await polymarketPlugin.handlePostCharacterLoaded!(mockCharacter);
            
            for (const action of polymarketPlugin.actions || []) {
                const isValid = await action.validate();
                expect(isValid).toBe(true);
            }
        });

        it('should have examples for all actions', async () => {
            // Initialize the plugin first
            const mockCharacter = {
                name: "TestBot",
                bio: "Test bot",
                lore: [],
                settings: {
                    secrets: {
                        POLYMARKET_API_KEY: "test-key",
                        POLYMARKET_SECRET: "test-secret",
                        POLYMARKET_PASSPHRASE: "test-passphrase",
                        WALLET_PRIVATE_KEY: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                        RPC_PROVIDER_URL: "https://polygon-rpc.com"
                    }
                }
            } as any;

            await polymarketPlugin.handlePostCharacterLoaded!(mockCharacter);
            
            for (const action of polymarketPlugin.actions || []) {
                expect(action.examples.length).toBeGreaterThan(0);
                for (const example of action.examples) {
                    expect(Array.isArray(example)).toBe(true);
                    expect(example.length).toBeGreaterThan(0);
                    
                    for (const message of example) {
                        expect(message.user).toBeDefined();
                        expect(message.content).toBeDefined();
                        expect(message.content.text).toBeDefined();
                    }
                }
            }
        });
    });
}); 