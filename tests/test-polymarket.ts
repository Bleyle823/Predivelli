import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { getPolymarketActions } from "../packages/plugin-polymarket/src/index";
import { AgentRuntime, type Action, type Memory, type HandlerCallback, ModelProviderName } from "../packages/core/src/index";

dotenvConfig({ path: resolve(process.cwd(), ".env") });

async function main() {
    try {
        console.log("=== Initializing Test ===");

        // Check if environment variables are set
        const apiKey = process.env.POLYMARKET_API_KEY;
        const secret = process.env.POLYMARKET_SECRET;
        const passphrase = process.env.POLYMARKET_PASSPHRASE;
        
        if (!apiKey || !secret || !passphrase) {
            console.log("⚠️  Warning: Polymarket API credentials not found in environment variables");
            console.log("   Please set the following environment variables:");
            console.log("   - POLYMARKET_API_KEY");
            console.log("   - POLYMARKET_SECRET");
            console.log("   - POLYMARKET_PASSPHRASE");
            console.log("   See POLYMARKET_SETUP.md for instructions");
            console.log("   Using test values for basic functionality testing...\n");
        } else {
            console.log("✅ Polymarket API credentials found in environment variables\n");
        }

        // A mock runtime for testing purposes
        const runtime = new AgentRuntime({
            character: { 
                name: "SBF", 
                modelProvider: ModelProviderName.OPENAI,
                bio: "Test character",
                lore: ["Test lore"],
                messageExamples: [],
                postExamples: [],
                topics: [],
                adjectives: [],
                plugins: [],
                style: {
                    all: [],
                    chat: [],
                    post: []
                }
            },
            modelProvider: ModelProviderName.OPENAI,
            token: "test-token"
        });
        
        // Mock message and state
        const message: Memory = {
            id: "test-message-id-12345-67890-abcde" as any,
            userId: "test-user-id-12345-67890-abcde" as any,
            agentId: "test-agent-id-12345-67890-abcde" as any,
            roomId: "test-room-id-12345-67890-abcde" as any,
            content: { text: "Show me the latest Polymarket markets" },
            createdAt: Date.now()
        };

        const state = undefined;

        // Mock callback
        const callback: HandlerCallback = async (response) => {
            console.log("\n=== Action Callback Response ===");
            console.log("Text:", response.text);
            if (response.content) {
                console.log("Content:", JSON.stringify(response.content, null, 2));
            }
            return [];
        };

        const actions = await getPolymarketActions();
        const getMarketsAction = actions.find(a => a.name === "GET_MARKETS");

        if (getMarketsAction && getMarketsAction.handler) {
            console.log("\n=== Executing GET_MARKETS Action ===");
            try {
                await getMarketsAction.handler(runtime, message, state, {}, callback);
            } catch (actionError) {
                console.error("Action execution failed:", actionError);
                if (actionError instanceof Error && 
                    (actionError.message.includes('401') || actionError.message.includes('Unauthorized'))) {
                    console.log("\n🔧 This looks like an API key issue. Please:");
                    console.log("1. Check POLYMARKET_SETUP.md for setup instructions");
                    console.log("2. Verify your API keys are valid and active");
                    console.log("3. Make sure your .env file is properly configured");
                }
            }
        } else {
            console.error("GET_MARKETS action not found!");
        }

    } catch (error) {
        console.error('Error in main function:', error);
        if (error instanceof Error && 
            (error.message.includes('401') || error.message.includes('Unauthorized'))) {
            console.log("\n🔧 This looks like an API key issue. Please:");
            console.log("1. Check POLYMARKET_SETUP.md for setup instructions");
            console.log("2. Verify your API keys are valid and active");
            console.log("3. Make sure your .env file is properly configured");
        }
    }
}

main(); 