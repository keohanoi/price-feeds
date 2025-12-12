import hre from "hardhat";
import fetch from "node-fetch";

/**
 * Feed Oracle Prices - Update MockPriceFeed contracts for Mantle Sepolia
 *
 * This script fetches real-time prices from CoinGecko API and updates the oracle price feeds.
 * Runs periodically using setInterval for continuous price updates.
 *
 * Usage:
 *   # Run with PM2 for production (recommended)
 *   pm2 start "npx hardhat run scripts/feedOraclePrices.ts --network mantleSepolia" --name oracle-feeder
 *
 *   # Run manually (runs once then loops every 30 minutes)
 *   npx hardhat run scripts/feedOraclePrices.ts --network mantleSepolia
 */

// CoinGecko API token IDs
const COINGECKO_IDS = {
  WETH: "ethereum",
  USDC: "usd-coin",
  BTC: "bitcoin",
  wstETH: "wrapped-steth",
};

// Update interval (hardcoded)
const UPDATE_INTERVAL_MINUTES = 30;

interface TokenPrices {
  WETH: number;
  USDC: number;
  BTC: number;
  wstETH: number;
}

/**
 * Fetch real-time prices from CoinGecko API
 */
async function fetchPricesFromAPI(): Promise<TokenPrices> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko API returned ${response.status}: ${response.statusText}`);
  }

  const data: any = await response.json();

  // Map CoinGecko IDs back to our token symbols
  const prices: TokenPrices = {
    WETH: data[COINGECKO_IDS.WETH]?.usd || 0,
    USDC: data[COINGECKO_IDS.USDC]?.usd || 0,
    BTC: data[COINGECKO_IDS.BTC]?.usd || 0,
    wstETH: data[COINGECKO_IDS.wstETH]?.usd || 0,
  };

  // Validate all prices were fetched
  for (const [symbol, price] of Object.entries(prices)) {
    if (!price || price <= 0) {
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }

  return prices;
}

/**
 * Update oracle prices on-chain
 */
async function updateOraclePrices() {
  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[${new Date().toISOString()}] Starting price update cycle`);
    console.log("=".repeat(60));

    // Fetch prices from CoinGecko
    console.log("\n🌐 Fetching prices from CoinGecko API...");
    const prices = await fetchPricesFromAPI();

    console.log("\n📊 Fetched Prices:");
    for (const [symbol, price] of Object.entries(prices)) {
      console.log(`  ${symbol.padEnd(8)}: $${price.toLocaleString()}`);
    }

    console.log("\n📝 Updating Price Feeds...");

    // Update each price feed
    let updatedCount = 0;
    for (const [symbol, usdPrice] of Object.entries(prices)) {
      try {
        const feedName = `${symbol}PriceFeed`;
        const priceFeed = await hre.ethers.getContract(feedName);

        // Convert USD to 8-decimal format (Chainlink standard)
        const price8Decimals = Math.floor(usdPrice * 1e8);

        const tx = await priceFeed.setAnswer(price8Decimals);
        await tx.wait();

        console.log(`  ✅ ${symbol}: $${usdPrice.toLocaleString()} (tx: ${tx.hash})`);
        updatedCount++;
      } catch (error: any) {
        console.error(`  ❌ ${symbol}: ${error.message}`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount}/${Object.keys(prices).length} price feed(s)`);
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ Update cycle failed:", error.message);
    console.error("Will retry on next cycle...\n");
  }
}

async function main() {
  console.log("\n=== Oracle Price Feeder ===");
  console.log("Network:", hre.network.name);
  console.log(`Update Interval: ${UPDATE_INTERVAL_MINUTES} minutes`);
  console.log("CoinGecko API: https://api.coingecko.com/api/v3");
  console.log("\nPress Ctrl+C to stop");

  // Run immediately on start
  await updateOraclePrices();

  // Then run periodically
  console.log(`\n⏱️  Scheduled to run every ${UPDATE_INTERVAL_MINUTES} minutes`);
  setInterval(updateOraclePrices, UPDATE_INTERVAL_MINUTES * 60 * 1000);
}

main().catch((error) => {
  console.error("\n❌ Fatal Error:", error);
  process.exit(1);
});
