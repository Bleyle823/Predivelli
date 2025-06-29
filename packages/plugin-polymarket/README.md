# Polymarket Plugin for Eliza OS v2.0

🔮 **Advanced Polymarket prediction market integration with full CLOB trading capabilities**

## Overview

The Polymarket Plugin for Eliza OS provides comprehensive access to Polymarket's prediction markets through their official CLOB (Central Limit Order Book) client. This plugin enables real-time trading, market analysis, portfolio management, and advanced order execution capabilities.

## Features

### 🎯 Core Trading Capabilities
- **Order Creation**: Create buy/sell orders with various order types (GTC, FOK, FAK, GTD)
- **Order Management**: View, cancel, and manage active orders
- **Market Orders**: Execute immediate market orders for instant fills
- **Portfolio Tracking**: Comprehensive portfolio analytics and performance metrics

### 📊 Market Data & Analysis
- **Real-time Market Data**: Access live market information, order books, and pricing
- **Market Discovery**: Browse and search through available prediction markets
- **Order Book Analysis**: View bid/ask spreads, liquidity depth, and market microstructure
- **Price History**: Historical price data and market trends

### 💰 Portfolio Management
- **Balance Tracking**: Monitor USDC balances and allowances
- **Position Management**: Track open positions and unrealized P&L
- **Trade History**: Complete trading history with performance analytics
- **Notifications**: Real-time notifications for order updates and market events

### 🔧 Advanced Features
- **API Key Management**: Automatic API key creation and management
- **Multi-chain Support**: Polygon mainnet and Amoy testnet support
- **Error Handling**: Comprehensive error handling and user feedback
- **Security**: Secure private key management and transaction signing

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Eliza OS environment
- Polygon wallet with MATIC for gas fees
- USDC balance for trading

### Setup

1. **Install Dependencies**
   ```bash
   npm install @elizaos/plugin-polymarket
   ```

2. **Environment Configuration**
   Create a `.env` file with the following variables:
   ```env
   # Required
   PK=your_private_key_here
   
   # Optional (defaults shown)
   CHAIN_ID=137                    # 137 for Polygon, 80002 for Amoy
   CLOB_API_URL=https://clob.polymarket.com
   RPC_URL=https://polygon-rpc.com
   FUNDER_ADDRESS=your_funder_address
   SIGNATURE_TYPE=0
   GEO_BLOCK_TOKEN=your_geo_token
   USE_SERVER_TIME=false
   ```

3. **Build the Plugin**
   ```bash
   npm run build
   ```

## Usage

### Basic Commands

#### Market Operations
```typescript
// Get available markets
"Show me the latest prediction markets"

// Get market details
"Get detailed info for market ID 12345"

// Browse markets by category
"List all active crypto markets"
```

#### Trading Operations
```typescript
// Create a buy order
"Buy 10 shares of market 12345 at $0.50"

// Create a sell order
"Sell 5 shares of market 12345 at $0.75"

// Market order
"Buy 20 shares of market 12345 at market price"
```

#### Portfolio Management
```typescript
// View portfolio
"Show me my portfolio"

// Check active orders
"Show my active orders"

// Cancel order
"Cancel order abc123"
```

### Advanced Usage

#### Order Types
- **GTC (Good Till Cancelled)**: Default order type, remains active until cancelled
- **FOK (Fill or Kill)**: Must be filled entirely or cancelled
- **FAK (Fill and Kill)**: Can be partially filled, remainder cancelled
- **GTD (Good Till Date)**: Expires at a specific time

#### Market Analysis
```typescript
// Get order book
"Show order book for market 12345"

// Get price history
"Show price history for market 12345"

// Get market statistics
"Get market stats for 12345"
```

## API Reference

### Actions

#### `GET_MARKETS`
Retrieve available prediction markets with filtering options.

**Parameters:**
- `marketType`: Filter by category (politics, sports, crypto, etc.)
- `limit`: Number of markets to return
- `cursor`: Pagination cursor
- `searchTerm`: Search keyword
- `activeOnly`: Show only active markets

#### `GET_MARKET_INFO`
Get detailed information about a specific market.

**Parameters:**
- `marketId`: Market identifier
- `tokenId`: Token ID for additional data

#### `CREATE_ORDER`
Create and place a new order.

**Parameters:**
- `tokenId`: Token ID for the market
- `side`: BUY or SELL
- `amount`: Order size
- `price`: Order price
- `orderType`: GTC, FOK, FAK, or GTD
- `feeRateBps`: Fee rate in basis points
- `expiration`: Expiration timestamp

#### `GET_ACTIVE_ORDERS`
Retrieve all active orders for the user.

#### `CANCEL_ORDER`
Cancel a specific order.

**Parameters:**
- `orderId`: Order ID to cancel

#### `GET_PORTFOLIO_STATS`
Get comprehensive portfolio statistics.

### Providers

#### `polymarket-wallet`
Provides wallet information including:
- Wallet address
- MATIC balance
- USDC balance and allowance
- Network information
- API credentials status

## Configuration

### Chain Configuration
- **Polygon Mainnet (137)**: Production environment
- **Polygon Amoy (80002)**: Test environment

### API Endpoints
- **Production**: `https://clob.polymarket.com`
- **Test**: `https://clob.polymarket.com` (same endpoint, different chain)

### Signature Types
- **0**: Browser Wallet (MetaMask, Coinbase Wallet, etc.)
- **1**: Magic/Email Login

## Security Considerations

### Private Key Management
- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider using hardware wallets for production

### API Security
- API keys are automatically managed by the plugin
- Keys are derived from your wallet signature
- No manual API key management required

### Transaction Security
- All transactions are signed locally
- Private keys never leave your environment
- Gas fees are paid in MATIC

## Error Handling

The plugin includes comprehensive error handling for:
- Network connectivity issues
- Insufficient balances
- Invalid order parameters
- API rate limiting
- Transaction failures

Common error scenarios and solutions:
- **Insufficient MATIC**: Add MATIC to your wallet for gas fees
- **Insufficient USDC**: Add USDC to your Polymarket profile
- **Invalid Token ID**: Verify the market and token ID
- **Order Rejected**: Check order parameters and market conditions

## Development

### Building from Source
```bash
git clone <repository>
cd plugin-polymarket
npm install
npm run build
```

### Testing
```bash
npm run test
npm run test:watch
```

### Development Mode
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Check the [Polymarket Documentation](https://docs.polymarket.com/)
- Review the [CLOB Client Documentation](https://github.com/Polymarket/clob-client)
- Open an issue in the repository

## Changelog

### v2.0.0
- Complete rewrite using official CLOB client
- Enhanced trading capabilities
- Improved portfolio management
- Better error handling and user feedback
- Real-time market data integration
- Advanced order types support

### v1.0.0
- Initial release
- Basic market data access
- Simple trading interface
