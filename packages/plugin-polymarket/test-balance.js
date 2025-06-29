// Test script for Polymarket balance checking functionality
// Usage: node test-balance.js

import { getAuthenticatedPolymarketClient } from './src/provider.js';
import { AssetType } from '@polymarket/clob-client';

// Mock runtime for testing
const mockRuntime = {
    getSetting: (key) => {
        const settings = {
            PK: process.env.PK,
            PRIVATE_KEY: process.env.PRIVATE_KEY,
            WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
            FUNDER_ADDRESS: process.env.FUNDER_ADDRESS || '0x993f563E24efee863BbD0E54FD5Ca3d010202c39'
        };
        return settings[key];
    }
};

async function testBalanceCheck() {
    try {
        console.log("=== Testing Polymarket Balance Check ===");
        
        // Check if private key is available
        const privateKey = process.env.PK || process.env.PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
        if (!privateKey) {
            console.log("❌ No private key found in environment variables");
            console.log("Please set PK, PRIVATE_KEY, or WALLET_PRIVATE_KEY");
            return;
        }
        
        console.log("✅ Private key found");
        
        // Test authenticated client creation
        console.log("\n1. Testing authenticated client creation...");
        const client = await getAuthenticatedPolymarketClient(mockRuntime);
        console.log("✅ Authenticated client created successfully");
        
        // Test balance check
        console.log("\n2. Testing balance check...");
        const balanceAllowance = await client.getBalanceAllowance({
            asset_type: AssetType.COLLATERAL
        });
        
        console.log("✅ Balance check successful");
        console.log("USDC Balance:", balanceAllowance.balance);
        console.log("USDC Allowance:", balanceAllowance.allowance);
        
        // Test market connection
        console.log("\n3. Testing market connection...");
        const markets = await client.getMarkets();
        console.log("✅ Market connection successful");
        console.log("Total markets found:", Array.isArray(markets) ? markets.length : 'Unknown');
        
        console.log("\n🎉 All tests passed!");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        console.error("Error details:", error.message);
    }
}

// Run the test
testBalanceCheck(); 