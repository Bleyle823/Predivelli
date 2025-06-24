# @elizaos/plugin-polymarket

Polymarket plugin for Eliza that enables interaction with Polymarket prediction markets for trading, market analysis, and order management.

## Features

- **Market Data**: Get events, market information, and real-time data
- **Trading**: Create buy/sell orders for prediction markets
- **Order Management**: View, cancel, and manage active orders
- **Wallet Integration**: Seamless integration with Polygon network
- **AI-Powered**: Natural language interaction for all trading operations

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:

```env
# Polymarket API Credentials
POLYMARKET_API_KEY=your_api_key
POLYMARKET_SECRET=your_api_secret
POLYMARKET_PASSPHRASE=your_api_passphrase

# Wallet Configuration
WALLET_PRIVATE_KEY=0x_your_private_key
RPC_PROVIDER_URL=https://polygon-rpc.com # Or your preferred Polygon RPC
```

3. Add the plugin to your character configuration:

```json
{
    "plugins": ["@elizaos/plugin-polymarket"],
    "settings": {
        "secrets": {
            "POLYMARKET_API_KEY": "your_api_key",
            "POLYMARKET_SECRET": "your_api_secret",
            "POLYMARKET_PASSPHRASE": "your_api_passphrase",
            "WALLET_PRIVATE_KEY": "0x_your_private_key",
            "RPC_PROVIDER_URL": "https://polygon-rpc.com"
        }
    }
}
```

## Available Actions

### Market Data Actions

#### GET_POLYMARKET_EVENTS
Get Polymarket events and markets
- **Triggers**: "show events", "list markets", "get events"
- **Parameters**: Optional search criteria, limit, active status
- **Returns**: List of available markets and events

#### GET_MARKET_INFO
Get detailed information about a specific market
- **Triggers**: "market details", "show market", "market info"
- **Parameters**: Market ID or token address
- **Returns**: Detailed market information including odds, volume, etc.

### Trading Actions

#### CREATE_ORDER
Create a buy or sell order on Polymarket
- **Triggers**: "buy", "sell", "place order", "bet"
- **Parameters**: Token ID, side (BUY/SELL), amount, price, outcome (YES/NO)
- **Returns**: Order confirmation and details

### Order Management Actions

#### GET_ACTIVE_ORDERS
Get all active orders for the wallet
- **Triggers**: "show orders", "my orders", "active orders"
- **Returns**: List of all active orders with details

#### CANCEL_ORDER
Cancel a specific order
- **Triggers**: "cancel order", "remove order"
- **Parameters**: Order ID
- **Returns**: Cancellation confirmation

#### CANCEL_ALL_ORDERS
Cancel all active orders
- **Triggers**: "cancel all orders", "remove all orders"
- **Returns**: Bulk cancellation confirmation

## Usage Examples

### Getting Market Information

```
User: "Show me the latest political events on Polymarket"
Agent: [Retrieves and displays current political prediction markets]

User: "Get details for market 0x1234..."
Agent: [Shows detailed market information including current odds and volume]
```

### Trading

```
User: "Buy 10 YES tokens at 0.65 for the election market"
Agent: [Creates buy order for YES outcome at specified price]

User: "Sell all my NO tokens in market 0x5678 at 0.40"
Agent: [Creates sell order for NO tokens at specified price]
```

### Order Management

```
User: "Show me my active orders"
Agent: [Lists all current open orders with details]

User: "Cancel order 12345"
Agent: [Cancels the specified order]

User: "Cancel all my orders"
Agent: [Cancels all active orders]
```

## Technical Details

### Dependencies

- **@elizaos/core**: Core Eliza framework
- **@goat-sdk/adapter-vercel-ai**: AI adapter for blockchain interactions
- **@goat-sdk/plugin-polymarket**: Polymarket integration toolkit
- **@goat-sdk/wallet-viem**: Viem wallet integration
- **viem**: Ethereum library for wallet and chain interactions

### Network Configuration

The plugin operates on Polygon network by default. Ensure your RPC provider supports Polygon mainnet.

### Security Considerations

- **Private Keys**: Store private keys securely and never commit to version control
- **API Credentials**: Use environment variables for all sensitive credentials
- **Network**: Ensure you're using a trusted RPC provider
- **Funds**: Start with small amounts for testing

## API Credentials Setup

1. **Create Polymarket Account**: Sign up at [polymarket.com](https://polymarket.com)
2. **Generate API Keys**: 
   - Go to Account Settings → API
   - Create new API key with trading permissions
   - Save the key, secret, and passphrase securely
3. **Fund Wallet**: Ensure your wallet has USDC on Polygon for trading

## Development

### Build the plugin:

```bash
pnpm build
```

### Run in development mode:

```bash
pnpm dev
```

### Run tests:

```bash
pnpm test
```

## Troubleshooting

### Common Issues

1. **"Missing API credentials"**
   - Verify all environment variables are set
   - Check API key permissions on Polymarket

2. **"Wallet connection failed"**
   - Ensure private key is valid and has 0x prefix
   - Verify RPC provider URL is accessible
   - Check wallet has MATIC for gas fees

3. **"Tool not found"**
   - Check GOAT SDK plugin versions are compatible
   - Verify Polymarket plugin is properly installed

4. **"Order creation failed"**
   - Ensure wallet has sufficient USDC balance
   - Check market is active and accepting orders
   - Verify price is within market bounds

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=polymarket:*
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review Polymarket API documentation
- Open an issue on the repository