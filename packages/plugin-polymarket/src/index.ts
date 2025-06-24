import type { Plugin, Character, Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { walletProvider } from "./provider";
import { getPolymarketClient, isPolymarketConfigured, getWalletAddress } from "./actions";

// Initial banner
console.log("\n╔═══════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                                                            ║");
console.log("║  ██████╗  ██████╗ ██╗   ██╗   ██╗███╗   ███╗ █████╗ ██████╗ ██╗  ██╗███████╗████████╗ ║");
console.log("║  ██╔══██╗██╔═══██╗██║   ╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝██╔════╝╚══██╔══╝ ║");
console.log("║  ██████╔╝██║   ██║██║    ╚████╔╝ ██╔████╔██║███████║██████╔╝█████╔╝ █████╗     ██║    ║");
console.log("║  ██╔═══╝ ██║   ██║██║     ╚██╔╝  ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ ██╔══╝     ██║    ║");
console.log("║  ██║     ╚██████╔╝███████╗ ██║   ██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗███████╗   ██║    ║");
console.log("║  ╚═╝      ╚═════╝ ╚══════╝ ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝    ║");

/**
 * Create Polymarket actions using the existing client functions
 */
const createPolymarketActions = (): Action[] => {
    return [
        {
            name: "GET_POLYMARKET_STATUS",
            similes: ["POLYMARKET_STATUS", "CHECK_POLYMARKET", "POLYMARKET_INFO"],
            description: "Check Polymarket connection status and wallet information",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    // Check if Polymarket is configured
                    if (!isPolymarketConfigured(runtime)) {
                        const errorMsg = "Polymarket is not properly configured. Please set the required environment variables.";
                        callback?.({ 
                            text: errorMsg, 
                            content: { error: errorMsg, configured: false } 
                        });
                        return false;
                    }

                    // Get wallet address
                    const walletAddress = getWalletAddress(runtime);
                    
                    // Try to get the client (this will test the connection)
                    const client = await getPolymarketClient(runtime);
                    
                    const statusInfo = {
                        configured: true,
                        walletAddress,
                        toolsAvailable: Object.keys(client).length,
                        toolNames: Object.keys(client)
                    };

                    const responseText = `✅ Polymarket is properly configured and connected!

🔗 Wallet Address: ${walletAddress}
🛠️ Available Tools: ${statusInfo.toolsAvailable}
📋 Tools: ${statusInfo.toolNames.join(', ')}

You can now use Polymarket features like viewing markets, placing orders, and managing your positions.`;

                    callback?.({ text: responseText, content: statusInfo });
                    return true;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorResponse = `❌ Error checking Polymarket status: ${errorMessage}`;
                    callback?.({ 
                        text: errorResponse, 
                        content: { error: errorMessage, configured: false } 
                    });
                    return false;
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "Check my Polymarket status" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "✅ Polymarket is properly configured and connected!..." }
                    }
                ]
            ]
        },
        {
            name: "GET_POLYMARKET_TOOLS",
            similes: ["LIST_TOOLS", "SHOW_TOOLS", "AVAILABLE_TOOLS"],
            description: "List all available Polymarket tools and their capabilities",
            validate: async () => true,
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State | undefined,
                options?: Record<string, unknown>,
                callback?: HandlerCallback
            ): Promise<boolean> => {
                try {
                    if (!isPolymarketConfigured(runtime)) {
                        const errorMsg = "Polymarket is not configured. Please set up your credentials first.";
                        callback?.({ 
                            text: errorMsg, 
                            content: { error: errorMsg } 
                        });
                        return false;
                    }

                    const client = await getPolymarketClient(runtime);
                    const tools = Object.keys(client);
                    
                    let responseText = "🛠️ Available Polymarket Tools:\n\n";
                    
                    tools.forEach((toolName, index) => {
                        responseText += `${index + 1}. **${toolName}**\n`;
                        // Add description if available
                        if (client[toolName] && typeof client[toolName] === 'object') {
                            const tool = client[toolName];
                            if (tool.description) {
                                responseText += `   Description: ${tool.description}\n`;
                            }
                        }
                        responseText += "\n";
                    });

                    responseText += `\nTotal tools available: ${tools.length}`;

                    callback?.({ 
                        text: responseText, 
                        content: { 
                            tools: tools,
                            totalTools: tools.length,
                            toolDetails: tools.map(name => ({ name, available: true }))
                        } 
                    });
                    return true;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorResponse = `❌ Error getting Polymarket tools: ${errorMessage}`;
                    callback?.({ 
                        text: errorResponse, 
                        content: { error: errorMessage } 
                    });
                    return false;
                }
            },
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: { text: "What Polymarket tools are available?" }
                    },
                    {
                        user: "{{user2}}",
                        content: { text: "🛠️ Available Polymarket Tools:..." }
                    }
                ]
            ]
        }
    ];
};

const initializeActions = async (character?: Character) => {
    try {
        // Validate environment variables
        const apiKey = character?.settings?.secrets?.POLYMARKET_API_KEY || process.env.POLYMARKET_API_KEY;
        const apiSecret = character?.settings?.secrets?.POLYMARKET_SECRET || process.env.POLYMARKET_SECRET;
        const apiPassphrase = character?.settings?.secrets?.POLYMARKET_PASSPHRASE || process.env.POLYMARKET_PASSPHRASE;
        const walletPrivateKey = character?.settings?.secrets?.WALLET_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
        const rpcProviderUrl = character?.settings?.secrets?.RPC_PROVIDER_URL || process.env.RPC_PROVIDER_URL;

        if (!apiKey || !apiSecret || !apiPassphrase) {
            console.warn("⚠️ Missing Polymarket API credentials - Polymarket actions will not be available");
            return [];
        }

        if (!walletPrivateKey || !rpcProviderUrl) {
            console.warn("⚠️ Missing wallet configuration - Polymarket actions will not be available");
            return [];
        }

        const actions = createPolymarketActions();
        console.log("✔ Polymarket actions initialized successfully.");
        return actions;
    } catch (error) {
        console.error("❌ Failed to initialize Polymarket actions:", error);
        return []; // Return empty array instead of failing
    }
};

export const polymarketPlugin: Plugin = {
    name: "[Polymarket] Integration",
    description: "Polymarket prediction market integration plugin",
    providers: [walletProvider],
    evaluators: [],
    services: [],
    actions: [], // Initialize as empty array, will be populated when plugin is loaded
    handlePostCharacterLoaded: async (character: Character): Promise<Character> => {
        // Initialize actions when character is loaded with character context
        const actions = await initializeActions(character);
        polymarketPlugin.actions = actions;
        return character;
    }
};

// Initialize actions when plugin is loaded (fallback for backward compatibility)
initializeActions().then(actions => {
    if (polymarketPlugin.actions && polymarketPlugin.actions.length === 0) {
        polymarketPlugin.actions = actions;
    }
}).catch(error => {
    console.error("Failed to initialize Polymarket plugin actions:", error);
    if (polymarketPlugin.actions && polymarketPlugin.actions.length === 0) {
        polymarketPlugin.actions = [];
    }
});

export default polymarketPlugin;