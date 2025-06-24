// src/provider.ts
import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { polymarket } from "@goat-sdk/plugin-polymarket";
import { viem } from "@goat-sdk/wallet-viem";
async function getPolymarketClient(runtime) {
  const apiKey = runtime?.getSetting("POLYMARKET_API_KEY") || process.env.POLYMARKET_API_KEY;
  const apiSecret = runtime?.getSetting("POLYMARKET_SECRET") || process.env.POLYMARKET_SECRET;
  const apiPassphrase = runtime?.getSetting("POLYMARKET_PASSPHRASE") || process.env.POLYMARKET_PASSPHRASE;
  const walletPrivateKey = runtime?.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
  const rpcProviderUrl = runtime?.getSetting("RPC_PROVIDER_URL") || process.env.RPC_PROVIDER_URL;
  if (!apiKey || !apiSecret || !apiPassphrase) {
    throw new Error("Missing required Polymarket API credentials. Please set POLYMARKET_API_KEY, POLYMARKET_SECRET, and POLYMARKET_PASSPHRASE environment variables or in character settings.");
  }
  if (!walletPrivateKey || !rpcProviderUrl) {
    throw new Error("Missing required wallet configuration. Please set WALLET_PRIVATE_KEY and RPC_PROVIDER_URL environment variables or in character settings.");
  }
  try {
    const account = privateKeyToAccount(walletPrivateKey);
    const walletClient = createWalletClient({
      account,
      transport: http(rpcProviderUrl),
      chain: polygon
    });
    const tools = await getOnChainTools({
      wallet: viem(walletClient),
      plugins: [
        polymarket({
          credentials: {
            key: apiKey,
            secret: apiSecret,
            passphrase: apiPassphrase
          }
        })
      ]
    });
    return { tools, walletClient, account };
  } catch (error) {
    console.error("Failed to initialize Polymarket client:", error);
    throw new Error(`Failed to initialize Polymarket client: ${error.message || "Unknown error"}`);
  }
}
var walletProvider = {
  async get(runtime) {
    try {
      const { account } = await getPolymarketClient(runtime);
      return `Polymarket Wallet Address: ${account.address}`;
    } catch (error) {
      console.error("Error in Polymarket provider:", error);
      return `Error initializing Polymarket wallet: ${error.message}`;
    }
  }
};

// src/actions.ts
import { http as http2 } from "viem";
import { createWalletClient as createWalletClient2 } from "viem";
import { privateKeyToAccount as privateKeyToAccount2 } from "viem/accounts";
import { polygon as polygon2 } from "viem/chains";
import { getOnChainTools as getOnChainTools2 } from "@goat-sdk/adapter-vercel-ai";
import { polymarket as polymarket2 } from "@goat-sdk/plugin-polymarket";
import { viem as viem2 } from "@goat-sdk/wallet-viem";
var cachedPolymarketTools = null;
async function getPolymarketClient2(runtime) {
  try {
    if (cachedPolymarketTools) {
      console.log("Returning cached Polymarket tools");
      return cachedPolymarketTools;
    }
    const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
    const rpcUrl = runtime.getSetting("RPC_PROVIDER_URL") || process.env.RPC_PROVIDER_URL;
    const apiKey = runtime.getSetting("POLYMARKET_API_KEY") || process.env.POLYMARKET_API_KEY;
    const apiSecret = runtime.getSetting("POLYMARKET_SECRET") || process.env.POLYMARKET_SECRET;
    const passphrase = runtime.getSetting("POLYMARKET_PASSPHRASE") || process.env.POLYMARKET_PASSPHRASE;
    if (!privateKey) {
      throw new Error("WALLET_PRIVATE_KEY is required");
    }
    if (!rpcUrl) {
      throw new Error("RPC_PROVIDER_URL is required");
    }
    if (!apiKey || !apiSecret || !passphrase) {
      throw new Error("Polymarket API credentials (key, secret, passphrase) are required");
    }
    console.log("Creating Polymarket client with GOAT SDK...");
    const account = privateKeyToAccount2(privateKey);
    const walletClient = createWalletClient2({
      account,
      transport: http2(rpcUrl),
      chain: polygon2
    });
    console.log("Wallet client created, getting onchain tools...");
    const tools = await getOnChainTools2({
      wallet: viem2(walletClient),
      plugins: [
        polymarket2({
          credentials: {
            key: apiKey,
            secret: apiSecret,
            passphrase
          }
        })
      ]
    });
    console.log("GOAT tools created successfully. Tool names:", Object.keys(tools));
    cachedPolymarketTools = tools;
    return tools;
  } catch (error) {
    console.error("Error creating Polymarket client:", error);
    throw error;
  }
}
function isPolymarketConfigured(runtime) {
  const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
  const rpcUrl = runtime.getSetting("RPC_PROVIDER_URL") || process.env.RPC_PROVIDER_URL;
  const apiKey = runtime.getSetting("POLYMARKET_API_KEY") || process.env.POLYMARKET_API_KEY;
  const apiSecret = runtime.getSetting("POLYMARKET_SECRET") || process.env.POLYMARKET_SECRET;
  const passphrase = runtime.getSetting("POLYMARKET_PASSPHRASE") || process.env.POLYMARKET_PASSPHRASE;
  return !!(privateKey && rpcUrl && apiKey && apiSecret && passphrase);
}
function getWalletAddress(runtime) {
  const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("WALLET_PRIVATE_KEY is required to get wallet address");
  }
  const account = privateKeyToAccount2(privateKey);
  return account.address;
}

// src/index.ts
console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
console.log("\u2551                                                            \u2551");
console.log("\u2551  \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557   \u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2551");
console.log("\u2551  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u255A\u2588\u2588\u2557 \u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551 \u2588\u2588\u2554\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D \u2551");
console.log("\u2551  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551    \u255A\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2588\u2588\u2588\u2557     \u2588\u2588\u2551    \u2551");
console.log("\u2551  \u2588\u2588\u2554\u2550\u2550\u2550\u255D \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551     \u255A\u2588\u2588\u2554\u255D  \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2588\u2588\u2557 \u2588\u2588\u2554\u2550\u2550\u255D     \u2588\u2588\u2551    \u2551");
console.log("\u2551  \u2588\u2588\u2551     \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2551   \u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557   \u2588\u2588\u2551    \u2551");
console.log("\u2551  \u255A\u2550\u255D      \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D   \u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D   \u255A\u2550\u255D    \u2551");
var createPolymarketActions = () => {
  return [
    {
      name: "GET_POLYMARKET_STATUS",
      similes: ["POLYMARKET_STATUS", "CHECK_POLYMARKET", "POLYMARKET_INFO"],
      description: "Check Polymarket connection status and wallet information",
      validate: async () => true,
      handler: async (runtime, message, state, options, callback) => {
        try {
          if (!isPolymarketConfigured(runtime)) {
            const errorMsg = "Polymarket is not properly configured. Please set the required environment variables.";
            callback?.({
              text: errorMsg,
              content: { error: errorMsg, configured: false }
            });
            return false;
          }
          const walletAddress = getWalletAddress(runtime);
          const client = await getPolymarketClient2(runtime);
          const statusInfo = {
            configured: true,
            walletAddress,
            toolsAvailable: Object.keys(client).length,
            toolNames: Object.keys(client)
          };
          const responseText = `\u2705 Polymarket is properly configured and connected!

\u{1F517} Wallet Address: ${walletAddress}
\u{1F6E0}\uFE0F Available Tools: ${statusInfo.toolsAvailable}
\u{1F4CB} Tools: ${statusInfo.toolNames.join(", ")}

You can now use Polymarket features like viewing markets, placing orders, and managing your positions.`;
          callback?.({ text: responseText, content: statusInfo });
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorResponse = `\u274C Error checking Polymarket status: ${errorMessage}`;
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
            content: { text: "\u2705 Polymarket is properly configured and connected!..." }
          }
        ]
      ]
    },
    {
      name: "GET_POLYMARKET_TOOLS",
      similes: ["LIST_TOOLS", "SHOW_TOOLS", "AVAILABLE_TOOLS"],
      description: "List all available Polymarket tools and their capabilities",
      validate: async () => true,
      handler: async (runtime, message, state, options, callback) => {
        try {
          if (!isPolymarketConfigured(runtime)) {
            const errorMsg = "Polymarket is not configured. Please set up your credentials first.";
            callback?.({
              text: errorMsg,
              content: { error: errorMsg }
            });
            return false;
          }
          const client = await getPolymarketClient2(runtime);
          const tools = Object.keys(client);
          let responseText = "\u{1F6E0}\uFE0F Available Polymarket Tools:\n\n";
          tools.forEach((toolName, index) => {
            responseText += `${index + 1}. **${toolName}**
`;
            if (client[toolName] && typeof client[toolName] === "object") {
              const tool = client[toolName];
              if (tool.description) {
                responseText += `   Description: ${tool.description}
`;
              }
            }
            responseText += "\n";
          });
          responseText += `
Total tools available: ${tools.length}`;
          callback?.({
            text: responseText,
            content: {
              tools,
              totalTools: tools.length,
              toolDetails: tools.map((name) => ({ name, available: true }))
            }
          });
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorResponse = `\u274C Error getting Polymarket tools: ${errorMessage}`;
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
            content: { text: "\u{1F6E0}\uFE0F Available Polymarket Tools:..." }
          }
        ]
      ]
    }
  ];
};
var initializeActions = async (character) => {
  try {
    const apiKey = character?.settings?.secrets?.POLYMARKET_API_KEY || process.env.POLYMARKET_API_KEY;
    const apiSecret = character?.settings?.secrets?.POLYMARKET_SECRET || process.env.POLYMARKET_SECRET;
    const apiPassphrase = character?.settings?.secrets?.POLYMARKET_PASSPHRASE || process.env.POLYMARKET_PASSPHRASE;
    const walletPrivateKey = character?.settings?.secrets?.WALLET_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
    const rpcProviderUrl = character?.settings?.secrets?.RPC_PROVIDER_URL || process.env.RPC_PROVIDER_URL;
    if (!apiKey || !apiSecret || !apiPassphrase) {
      console.warn("\u26A0\uFE0F Missing Polymarket API credentials - Polymarket actions will not be available");
      return [];
    }
    if (!walletPrivateKey || !rpcProviderUrl) {
      console.warn("\u26A0\uFE0F Missing wallet configuration - Polymarket actions will not be available");
      return [];
    }
    const actions = createPolymarketActions();
    console.log("\u2714 Polymarket actions initialized successfully.");
    return actions;
  } catch (error) {
    console.error("\u274C Failed to initialize Polymarket actions:", error);
    return [];
  }
};
var polymarketPlugin = {
  name: "[Polymarket] Integration",
  description: "Polymarket prediction market integration plugin",
  providers: [walletProvider],
  evaluators: [],
  services: [],
  actions: [],
  // Initialize as empty array, will be populated when plugin is loaded
  handlePostCharacterLoaded: async (character) => {
    const actions = await initializeActions(character);
    polymarketPlugin.actions = actions;
    return character;
  }
};
initializeActions().then((actions) => {
  if (polymarketPlugin.actions && polymarketPlugin.actions.length === 0) {
    polymarketPlugin.actions = actions;
  }
}).catch((error) => {
  console.error("Failed to initialize Polymarket plugin actions:", error);
  if (polymarketPlugin.actions && polymarketPlugin.actions.length === 0) {
    polymarketPlugin.actions = [];
  }
});
var index_default = polymarketPlugin;
export {
  index_default as default,
  polymarketPlugin
};
//# sourceMappingURL=index.js.map