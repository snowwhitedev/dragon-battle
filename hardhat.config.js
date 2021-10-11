const { utils } = require("ethers");

require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const accounts = {
  mnemonic:
    process.env.MNEMONIC ||
    "test test test test test test test test test test test junk",
  // accountsBalance: "990000000000000000000",
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  gasReporter: {
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: "USD",
    enabled: false,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    dev: {
      default: 1,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      settings: {
        optimizer: {
          enabled: true,
          runs: 9999,
        },
      },
      forking: {
        url: "https://polygon-mainnet.g.alchemy.com/v2/YH7aKkMfvT_Mq0qYZOPGdsr0dM0GC4xe",
        enabled: true,
        // blockNumber: 18899628,
        blockNumber: 5931780,
      },
      gasPrice: parseInt(utils.parseUnits("50", "gwei")),
    },
    // hardhat: {
    //   hardfork: "london",
    //   allowUnlimitedContractSize: true,
    //   settings: {
    //     optimizer: {
    //       enabled: true,
    //       runs: 9999,
    //     },
    //   },
    //   evmVersion: "byzantium",
    //   forking: {
    //     url: "https://eth-rinkeby.alchemyapi.io/v2/8SAQa7xMc0VXTR_hyfPvAt2pe3QrXybB",
    //     enabled: true,
    //     // blockNumber: 7041459 //6430278 //7041458 //6615559 10207859 11869355
    //   },
    //   gasPrice: "auto",
    // },
    // hardhat: {
    //   gasPrice: parseInt(utils.parseUnits("50", "gwei")),
    // },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts,
      chainId: 1,
      live: false,
      saveDeployments: true,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts,
      chainId: 4,
      live: false,
      saveDeployments: true,
      tags: ["staging"],
      gasPrice: 5000000000,
      gasMultiplier: 2,
    },
    bscTest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: { mnemonic: process.env.MNEMONIC },
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    bscMain: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: { mnemonic: process.env.MNEMONIC },
      live: true,
      saveDeployments: true,
    },
  },
  etherscan: {
    apiKey: process.env.BSC_API_KEY, // BSC_API_KEY
  },
  paths: {
    deploy: "deploy",
    deployments: "deployments",
    sources: "contracts",
    tests: "test",
  },
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
    },
  },
};
