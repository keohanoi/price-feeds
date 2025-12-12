import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { ethers } from "ethers";

import { HardhatUserConfig, task, types } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import "@nomicfoundation/hardhat-chai-matchers";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-abi-exporter";

const getNetworkFromCLI = () => {
  if (process.env.HARDHAT_NETWORK) return process.env.HARDHAT_NETWORK;
  const i = process.argv.indexOf("--network");
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "hardhat";
};

const HARDHAT_NETWORK = getNetworkFromCLI();

const getRpcUrl = (network) => {
  const defaultRpcs = {
    arbitrum: "https://arb1.arbitrum.io/rpc",
    avalanche: "https://api.avax.network/ext/bc/C/rpc",
    botanix: "https://rpc.botanixlabs.com",
    arbitrumGoerli: "https://goerli-rollup.arbitrum.io/rpc",
    arbitrumSepolia: "https://sepolia-rollup.arbitrum.io/rpc",
    sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
    avalancheFuji: "https://api.avax-test.network/ext/bc/C/rpc",
    baseSepolia: "https://sepolia.base.org",
    snowtrace: "https://api.avax.network/ext/bc/C/rpc",
    arbitrumBlockscout: "https://arb1.arbitrum.io/rpc",
    mantle: "https://rpc.mantle.xyz",
    mantleSepolia: "https://rpc.sepolia.mantle.xyz/",
  };

  let rpc = defaultRpcs[network];

  const filepath = path.join("./.rpcs.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath).toString());
    if (data[network]) {
      rpc = data[network];
    }
  }

  return rpc;
};

export const getExplorerUrl = (network) => {
  const urls = {
    arbitrum: "https://api.etherscan.io/v2/api?chainid=42161",
    // avalanche: "https://api.snowtrace.io/",
    avalanche: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/",
    botanix: "https://api.routescan.io/v2/network/mainnet/evm/3637/etherscan/",
    snowscan: "https://api.snowscan.xyz/",
    arbitrumGoerli: "https://api-goerli.arbiscan.io/",
    arbitrumSepolia: "https://api.etherscan.io/v2/api?chainid=421614",
    baseSepolia: "https://api.etherscan.io/v2/api?chainid=84532",
    sepolia: "https://api.etherscan.io/v2/api?chainid=11155111",
    avalancheFuji: "https://api-testnet.snowtrace.io/",
    arbitrumBlockscout: "https://arbitrum.blockscout.com/api",
    mantle: "https://api.mantlescan.xyz/api",
    mantleSepolia: "https://api-sepolia.mantlescan.xyz/api",
  };

  const url = urls[network];
  if (!url) {
    throw new Error(`Empty explorer url for ${network}`);
  }

  return url;
};

export const getBlockExplorerUrl = (network) => {
  const urls = {
    arbitrum: "https://arbiscan.io",
    avalanche: "https://snowtrace.io",
    botanix: "https://botanixscan.io",
    arbitrumSepolia: "https://sepolia.arbiscan.io",
    baseSepolia: "https://sepolia.basescan.io",
    avalancheFuji: "https://testnet.snowtrace.io",
    mantle: "https://explorer.mantle.xyz",
    mantleSepolia: "https://explorer.sepolia.mantle.xyz",
  };

  const url = urls[network];
  if (!url) {
    throw new Error(`No block explorer URL configured for network: ${network}`);
  }

  return url;
};

// for etherscan, a single string is expected to be returned
// for other networks / explorers, an object is needed
const getEtherscanApiKey = () => {
  if (["arbitrum", "arbitrumSepolia"].includes(HARDHAT_NETWORK)) {
    return process.env.ARBISCAN_API_KEY;
  }

  if (["mantle", "mantleSepolia"].includes(HARDHAT_NETWORK)) {
    return process.env.MANTLE_SCAN_API_KEY || "";
  }

  return {
    // hardhat-verify plugin uses "avalancheFujiTestnet" name
    arbitrumOne: process.env.ARBISCAN_API_KEY,
    avalanche: process.env.SNOWTRACE_API_KEY,
    arbitrumGoerli: process.env.ARBISCAN_API_KEY,
    sepolia: process.env.ETHERSCAN_API_KEY,
    arbitrumSepolia: process.env.ARBISCAN_API_KEY,
    baseSepolia: process.env.BASESCAN_API_KEY,
    avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
    snowtrace: "snowtrace", // apiKey is not required, just set a placeholder
    arbitrumBlockscout: "arbitrumBlockscout",
    botanix: process.env.BOTANIX_SCAN_API_KEY,
    mantle: process.env.MANTLE_SCAN_API_KEY || "",
    mantleSepolia: process.env.MANTLE_SCAN_API_KEY || "",
  };
};

const getEnvAccounts = (chainName?: string) => {
  const { ACCOUNT_KEY, ACCOUNT_KEY_FILE, ARBITRUM_SEPOLIA_ACCOUNT_KEY, ARBITRUM_ACCOUNT_KEY } = process.env;

  if (chainName === "arbitrumSepolia" && ARBITRUM_SEPOLIA_ACCOUNT_KEY) {
    return [ARBITRUM_SEPOLIA_ACCOUNT_KEY];
  }

  if (chainName === "arbitrum" && ARBITRUM_ACCOUNT_KEY) {
    return [ARBITRUM_ACCOUNT_KEY];
  }

  if (ACCOUNT_KEY) {
    return [ACCOUNT_KEY];
  }

  if (ACCOUNT_KEY_FILE) {
    const filepath = path.join("./keys/", ACCOUNT_KEY_FILE);
    const data = JSON.parse(fs.readFileSync(filepath).toString());
    if (!data) {
      throw new Error("Invalid key file");
    }

    if (data.key) {
      return [data.key];
    }

    if (!data.mnemonic) {
      throw new Error("Invalid mnemonic");
    }

    const wallet = ethers.Wallet.fromMnemonic(data.mnemonic);
    return [wallet.privateKey];
  }

  return [];
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.29",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10,
            details: {
              constantOptimizer: true,
            },
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      saveDeployments: true,
      allowUnlimitedContractSize: true,
      forking: {
        url: getRpcUrl("mantleSepolia"),
        blockNumber: 31578449,
      },
    },
    anvil: {
      url: "http://127.0.0.1:8545",
      chainId: Number(process.env.FORK_ID) || 42161, // default to Arbitrum One
    },
    localhost: {
      saveDeployments: true,
    },
    arbitrum: {
      url: getRpcUrl("arbitrum"),
      chainId: 42161,
      accounts: getEnvAccounts(),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("arbitrum"),
          apiKey: process.env.ARBISCAN_API_KEY,
        },
      },
      blockGasLimit: 20_000_000,
    },
    avalanche: {
      url: getRpcUrl("avalanche"),
      chainId: 43114,
      accounts: getEnvAccounts(),
      gasPrice: 200000000000,
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("avalanche"),
          apiKey: process.env.SNOWTRACE_API_KEY,
        },
      },
      blockGasLimit: 15_000_000,
    },
    botanix: {
      url: getRpcUrl("botanix"),
      chainId: 3637,
      accounts: getEnvAccounts(),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("botanix"),
          apiKey: process.env.BOTANIX_SCAN_API_KEY,
        },
      },
      blockGasLimit: 20_000_000,
    },
    snowscan: {
      url: getRpcUrl("avalanche"),
      chainId: 43114,
      accounts: getEnvAccounts(),
      gasPrice: 200000000000,
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("snowscan"),
          apiKey: process.env.SNOWTRACE_API_KEY,
        },
      },
      blockGasLimit: 15_000_000,
    },
    snowtrace: {
      url: getRpcUrl("snowtrace"),
      accounts: getEnvAccounts(),
    },
    arbitrumBlockscout: {
      url: getRpcUrl("arbitrumBlockscout"),
      accounts: getEnvAccounts(),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("arbitrumBlockscout"),
          apiKey: "arbitrumBlockscout",
        },
      },
    },
    arbitrumGoerli: {
      url: getRpcUrl("arbitrumGoerli"),
      chainId: 421613,
      accounts: getEnvAccounts(),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("arbitrumGoerli"),
          apiKey: process.env.ARBISCAN_API_KEY,
        },
      },
      blockGasLimit: 10000000,
    },
    arbitrumSepolia: {
      url: getRpcUrl("arbitrumSepolia"),
      chainId: 421614,
      accounts: getEnvAccounts("arbitrumSepolia"),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("arbitrumSepolia"),
          apiKey: process.env.ARBISCAN_API_KEY,
        },
      },
      blockGasLimit: 10000000,
    },
    baseSepolia: {
      url: getRpcUrl("baseSepolia"),
      chainId: 84532,
      accounts: getEnvAccounts("baseSepolia"),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("baseSepolia"),
          apiKey: process.env.BASESCAN_API_KEY,
        },
      },
      blockGasLimit: 10000000,
    },
    sepolia: {
      url: getRpcUrl("sepolia"),
      chainId: 11155111,
      accounts: getEnvAccounts("sepolia"),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("sepolia"),
          apiKey: process.env.ETHERSCAN_API_KEY,
        },
      },
      blockGasLimit: 10000000,
    },
    avalancheFuji: {
      url: getRpcUrl("avalancheFuji"),
      chainId: 43113,
      accounts: getEnvAccounts(),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("avalancheFuji"),
          apiKey: process.env.SNOWTRACE_API_KEY,
        },
      },
      blockGasLimit: 2500000,
      // gasPrice: 50000000000,
    },
    mantle: {
      url: getRpcUrl("mantle"),
      chainId: 5000,
      accounts: getEnvAccounts(),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("mantle"),
          apiKey: process.env.MANTLE_SCAN_API_KEY || "",
        },
      },
      blockGasLimit: 30_000_000,
      gasPrice: "auto",
    },
    mantleSepolia: {
      url: getRpcUrl("mantleSepolia"),
      chainId: 5003,
      accounts: getEnvAccounts(),
      verify: {
        etherscan: {
          apiUrl: getExplorerUrl("mantleSepolia"),
          apiKey: process.env.MANTLE_SCAN_API_KEY || "",
        },
      },
      blockGasLimit: 200_000_000_000, // Mantle Sepolia actual block gas limit
      gasPrice: "auto",
    },
  },
  // hardhat-deploy has issues with some contracts
  // https://github.com/wighawag/hardhat-deploy/issues/264
  etherscan: {
    apiKey: getEtherscanApiKey(),
    customChains: [
      {
        network: "snowtrace",
        chainId: 43114,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/",
          browserURL: "https://avalanche.routescan.io",
        },
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "botanix",
        chainId: 3637,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/3637/etherscan",
          browserURL: "https://botanixscan.io",
        },
      },
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api",
          browserURL: "https://snowtrace.io",
        },
      },
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://api.mantlescan.xyz/api",
          browserURL: "https://explorer.mantle.xyz",
        },
      },
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://api-sepolia.mantlescan.xyz/api",
          browserURL: "https://explorer.sepolia.mantle.xyz",
        },
      },
      // {
      //   network: "arbitrumBlockscout",
      //   chainId: 42161,
      //   urls: {
      //     apiURL: "https://arbitrum.blockscout.com/api",
      //     browserURL: "https://arbitrum.blockscout.com",
      //   },
      // },
    ],
  },
  sourcify: {
    enabled: false,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 100000000,
  },
  abiExporter: {
    flat: true,
  },
};

export default config;
