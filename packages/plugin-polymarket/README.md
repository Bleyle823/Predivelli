# @elizaos/plugin-polymarket

A powerful Polymarket prediction markets integration plugin for ElizaOS that enables AI agents to fetch market data, check balances, and place bets on prediction markets.

## 🚀 Features

- **Real-time Market Data**: Fetch current active markets using Polymarket's CLOB API
- **High Activity Markets**: Get markets with high trading volume and liquidity
- **Balance Management**: Check USDC balance and allowance
- **Automated Betting**: Place bets on market outcomes with proper authentication
- **Smart Filtering**: Intelligent filtering for active, accepting-orders markets
- **Activity Scoring**: Markets ranked by volume, liquidity, and urgency
- **Comprehensive Market Details**: Detailed information including outcomes, prices, and metadata

## 📦 Installation

```bash
npm install @elizaos/plugin-polymarket
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file or set these environment variables in your ElizaOS character secrets:

```env
# Polymarket API Configuration
CLOB_API_URL=https://clob.polymarket.com
CHAIN_ID=137  # Polygon mainnet

# Authentication (Required for trading)
POLYMARKET_API_KEY=your_api_key_here
POLYMARKET_SECRET=your_secret_here
POLYMARKET_PASSPHRASE=your_passphrase_here

# Wallet Configuration (Required for trading)
PK=your_wallet_private_key_here
# OR
PRIVATE_KEY=your_wallet_private_key_here
# OR
WALLET_PRIVATE_KEY=your_wallet_private_key_here

# Optional: Funder Address
FUNDER_ADDRESS=0x993f563E24efee863BbD0E54FD5Ca3d010202c39
```

### Character Configuration

Add the plugin to your ElizaOS character configuration:

```json
{
  "plugins": ["@elizaos/plugin-polymarket"]
}
```

## 🎯 Available Actions

### 1. GET_MARKETS
Fetch current active markets from Polymarket.

**Similes**: `markets`, `betting markets`, `available bets`, `what can I bet on`, `latest markets`

**Parameters**:
- `limit` (optional): Maximum number of markets to return (default: 10, max: 20)
- `active` (optional): Filter for active markets only (default: true)

**Example**:
```
User: "What are the current active betting markets?"
Agent: [Fetches and displays current markets with activity indicators]
```

### 2. GET_HIGH_ACTIVITY_MARKETS
Get markets with high trading volume and liquidity.

**Similes**: `high volume markets`, `busy markets`, `popular markets`, `trending markets`

**Parameters**:
- `limit` (optional): Maximum number of markets to return (default: 10, max: 20)
- `minVolume` (optional): Minimum 24h volume threshold in USD (default: 1000)

**Example**:
```
User: "Show me the high volume markets"
Agent: [Fetches markets with high activity scores]
```

### 3. GET_MARKET
Get detailed information about a specific market.

**Similes**: `market details`, `specific market`, `market info`

**Parameters**:
- `conditionId` (required): The condition ID of the market

**Example**:
```
User: "Can you show me details about the market with condition ID xyz123?"
Agent: [Fetches detailed market information]
```

### 4. GET_MORE_MARKETS
Get the next batch of markets for pagination.

**Similes**: `more markets`, `next page`, `continue`, `see more`

**Parameters**:
- `cursor` (optional): The cursor for pagination
- `limit` (optional): Maximum number of markets to return (default: 10)

### 5. CHECK_BALANCE
Check USDC balance and allowance on Polymarket.

**Similes**: `balance`, `funds`, `money`, `usdc`, `check wallet`

**Example**:
```
User: "What's my balance?"
Agent: [Checks and displays USDC balance and allowance]
```

### 6. PLACE_BET
Place a bet on a Polymarket outcome.

**Similes**: `bet`, `wager`, `place order`, `buy shares`, `sell shares`

**Parameters**:
- `tokenId` (required): The token ID of the market outcome
- `side` (required): "BUY" or "SELL"
- `amount` (required): Amount of USDC to bet
- `price` (required): Price per share (0.01 to 0.99)

**Example**:
```
User: "I want to bet $10 on Trump winning at 65 cents per share"
Agent: [Places the bet and confirms the order]
```

## 📊 Market Data Structure

Each market includes comprehensive information:

```typescript
interface PolymarketMarket {
  condition_id: string;
  question: string;
  description: string;
  active: boolean;
  accepting_orders: boolean;
  end_date_iso: string;
  volume24hr: string;
  liquidity: string;
  minimum_order_size: string;
  tokens: PolymarketToken[];
  activity_score: number;
  freshness_days: number;
  tags: string[];
}
```

## 🎨 Activity Indicators

The plugin uses visual indicators to help identify market status:

- **Status**: 🟢 Accepting Orders | 🟡 Active | 🔴 Closed | ⚪ Unknown
- **Activity**: 🔥🔥🔥 Ultra High (50k+) | 🔥🔥 Very High (20k+) | 🔥 High (10k+) | ⚡ Medium
- **Urgency**: 🚨 Ending Today | ⏰ Ending This Week | 📅 Ending This Month | 📆 Long Term

## 🔐 Authentication Modes

### Read-Only Mode
When API credentials are not provided, the plugin operates in read-only mode:
- ✅ Fetch market data
- ✅ Check balances
- ❌ Place bets

### Authenticated Mode
With proper API credentials and wallet private key:
- ✅ All read-only features
- ✅ Place bets and orders
- ✅ Full trading capabilities

## 🛠️ Development

### Building the Plugin

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Linting

```bash
npm run lint
```

## 📋 Dependencies

- `@elizaos/core`: ElizaOS core framework
- `@polymarket/clob-client`: Official Polymarket CLOB client
- `@ethersproject/wallet`: Ethereum wallet functionality
- `zod`: Schema validation

## 🔧 Troubleshooting

### Common Issues

1. **"Private key not found"**
   - Ensure you've set `PK`, `PRIVATE_KEY`, or `WALLET_PRIVATE_KEY` in your environment

2. **"Polymarket API credentials not found"**
   - Set `POLYMARKET_API_KEY`, `POLYMARKET_SECRET`, and `POLYMARKET_PASSPHRASE`

3. **"Insufficient USDC balance"**
   - Check your wallet has sufficient USDC for the bet amount

4. **"Market not found"**
   - Verify the condition ID is correct and the market is still active

### Debug Mode

Enable debug mode to see all markets without filtering:

```env
DEBUG_SHOW_ALL_MARKETS=true
```

## 📈 Activity Scoring

Markets are scored based on:
- **24h Volume**: Primary factor for activity
- **Liquidity**: Secondary factor (weighted at 10%)
- **Formula**: `activityScore = volume24hr + (liquidity * 0.1)`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [ElizaOS Documentation](https://docs.elizaos.com)
- [Polymarket API Documentation](https://docs.polymarket.com)
- [CLOB Client Documentation](https://github.com/Polymarket/clob-client)

## ⚠️ Disclaimer

This plugin is for educational and development purposes. Always test with small amounts before using with real funds. The authors are not responsible for any financial losses incurred through the use of this plugin.

---

**Version**: 0.0.1  
**Last Updated**: January 2025  
**Compatibility**: ElizaOS Core, Node.js >=18.0.0

