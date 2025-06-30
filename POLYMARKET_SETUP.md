# Polymarket API Setup Guide

## Issue
You're getting a 401 Unauthorized error with "Invalid api key" message when trying to use the Polymarket plugin.

## Solution

### 1. Get Valid API Keys
1. Go to [Polymarket API Keys](https://polymarket.com/api-keys)
2. Create a new API key or check your existing ones
3. Make sure your API key is active and has the necessary permissions

### 2. Set Up Environment Variables
Create a `.env` file in the root directory with your API credentials:

```bash
# Copy the example file
cp env.example .env

# Edit the .env file with your actual API keys
```

Your `.env` file should contain:
```env
# Polymarket API Configuration
POLYMARKET_API_KEY=your_actual_api_key_here
POLYMARKET_SECRET=your_actual_secret_here
POLYMARKET_PASSPHRASE=your_actual_passphrase_here

# Wallet Configuration
WALLET_PRIVATE_KEY=your_wallet_private_key_here

# RPC Configuration
RPC_PROVIDER_URL=https://polygon-rpc.com

# Chain Configuration
CHAIN_ID=137

# Optional: Custom CLOB API URL
CLOB_API_URL=https://clob.polymarket.com
```

### 3. Verify API Key Format
Make sure your API keys follow the correct format:
- API Key: Usually a UUID format (e.g., `8093edbd-647a-24fa-595e-d79373be99b7`)
- Secret: Base64 encoded string
- Passphrase: 64-character hex string

### 4. Test Your Configuration
Run the test to verify your setup:

```bash
# Test the basic plugin
node test-polymarket.js

# Test with the SBF agent (requires server running)
node test-sbf-polymarket.js
```

### 5. Common Issues and Solutions

#### Issue: API Key Expired
- Solution: Generate a new API key from Polymarket dashboard

#### Issue: Insufficient Permissions
- Solution: Check that your API key has the necessary permissions for trading/reading markets

#### Issue: Rate Limiting
- Solution: Wait a few minutes and try again, or check your API usage limits

#### Issue: Network Issues
- Solution: Verify your internet connection and that you can access `https://clob.polymarket.com`

### 6. Security Notes
- Never commit your `.env` file to version control
- Keep your API keys secure and don't share them
- Consider using a test wallet for development

### 7. Alternative: Use Test Keys
For development/testing, you can use the test keys provided in the character file, but they may be expired. It's recommended to get your own API keys for production use.

## Need Help?
If you're still having issues:
1. Check the Polymarket API documentation
2. Verify your API key status in the Polymarket dashboard
3. Contact Polymarket support if your API key is not working 