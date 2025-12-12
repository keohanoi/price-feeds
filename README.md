# Price Feeds Oracle

Oracle price feeder for Mantle Sepolia that fetches real-time cryptocurrency prices from CoinGecko and updates on-chain price feed contracts.

## Features

- Fetches real-time prices for WETH, USDC, BTC, and wstETH from CoinGecko API
- Updates price feed contracts on Mantle Sepolia network
- Runs continuously with configurable update intervals (default: 30 minutes)
- PM2 process management support for production deployments

## Prerequisites

- Node.js
- Hardhat
- Private key for Mantle Sepolia deployment account

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with your private key:

```env
ACCOUNT_KEY=your_private_key_here
```

## Usage

### Run Once

```bash
npm start
```

### Run with PM2 (Production)

```bash
npm run pm2-start
```

Or manually:

```bash
pm2 start "npx hardhat run scripts/feedOraclePrices.ts --network mantleSepolia" --name oracle-feeder
```

## Supported Networks

- Mantle Sepolia (Chain ID: 5003)
- Arbitrum
- Avalanche
- And more (see `hardhat.config.ts`)

## Script Details

The `feedOraclePrices.ts` script:
1. Connects to Mantle Sepolia network
2. Fetches prices from CoinGecko API
3. Updates MockPriceFeed contracts with 8-decimal precision
4. Repeats every 30 minutes

## License

ISC