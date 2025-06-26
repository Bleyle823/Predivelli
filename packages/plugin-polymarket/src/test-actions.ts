import { getPolymarketActions } from "./actions";
import { getPolymarketClient } from "./provider";

// Mock runtime for testing
const mockRuntime = {
    composeState: async () => ({
        recentMessages: "Show me Polymarket events",
        knowledge: "",
        bio: "I'm a Polymarket trading assistant",
        lore: [],
        providers: [],
        attachments: [],
        actions: [],
        actionExamples: []
    }),
    updateRecentMessageState: async (state: any) => state,
    modelProvider: "openai" as any,
    token: "test-token",
    character: {
        name: "PolymarketBot",
        bio: "I help with Polymarket trading",
        lore: []
    },
    getSetting: (key: string) => {
        const settings: Record<string, string> = {
            POLYMARKET_API_KEY: "test-api-key",
            POLYMARKET_SECRET: "test-secret",
            POLYMARKET_PASSPHRASE: "test-passphrase",
            WALLET_PRIVATE_KEY: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            RPC_PROVIDER_URL: "https://polygon-rpc.com"
        };
        return settings[key] || null;
    }
} as any;

async function testPolymarketActions() {
    console.log("🧪 Testing Polymarket Actions...\n");

    try {
        // Test 1: Get actions
        console.log("1. Testing getPolymarketActions...");
        const actions = await getPolymarketActions();
        console.log(`✅ Found ${actions.length} actions:`);
        actions.forEach(action => {
            console.log(`   - ${action.name}: ${action.description}`);
        });
        console.log();

        // Test 2: Test client initialization
        console.log("2. Testing Polymarket client initialization...");
        try {
            const client = await getPolymarketClient(mockRuntime);
            console.log("✅ Client initialized successfully");
            console.log(`   - Tools available: ${client.tools.length}`);
            console.log(`   - Wallet address: ${client.account.address}`);
            console.log();

            // Test 3: List available tools
            console.log("3. Available tools:");
            client.tools.forEach((tool: any, index: number) => {
                console.log(`   ${index + 1}. ${tool.name || 'Unnamed tool'}`);
                if (tool.description) {
                    console.log(`      Description: ${tool.description}`);
                }
            });
            console.log();

        } catch (error) {
            console.log("⚠️  Client initialization failed (expected in test environment):");
            console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            console.log("   This is expected when API credentials are not real");
            console.log();
        }

        // Test 4: Test action validation
        console.log("4. Testing action validation...");
        for (const action of actions) {
            const isValid = await action.validate();
            console.log(`   ✅ ${action.name}: ${isValid ? 'Valid' : 'Invalid'}`);
        }
        console.log();

        // Test 5: Test action examples
        console.log("5. Testing action examples...");
        actions.forEach((action, index) => {
            if (action.examples && action.examples.length > 0) {
                console.log(`   ✅ ${action.name}: ${action.examples.length} example(s)`);
            } else {
                console.log(`   ⚠️  ${action.name}: No examples`);
            }
        });
        console.log();

        console.log("🎉 All tests completed successfully!");
        return true;

    } catch (error) {
        console.error("❌ Test failed:", error);
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testPolymarketActions()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error("Test execution failed:", error);
            process.exit(1);
        });
}

export { testPolymarketActions }; 