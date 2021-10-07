const fs = require("fs");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { createPair, createPairETH, getContract, getBigNumber } = require("./shared");
const UniswapV2Router = require("./abis/UniswapV2Router.json");
const DeployedTokens = require('./args/tokens_dev.json');

require("dotenv").config();

// const ROUTER_ADDRESS = "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921"; // avalanche fuji
// const FACTORY_ADDRESS = "0xE4A575550C2b460d2307b82dCd7aFe84AD1484dd"; // avalanche fuji

const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // avalanche fuji
const FACTORY_ADDRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // avalanche fuji

/**
 * This script is only for testnet, don't use it on mainnet
 */
async function main() {
  console.log(
    "Preparing liquidity pairs and Writing result in scripts/args/pairs_dev.json..."
  );
  const signers = await ethers.getSigners();
  const alice = signers[0];
  
  const routerContract = getContract(ROUTER_ADDRESS, UniswapV2Router);
  const factory = await routerContract.factory();

  console.log('[factory]', factory);
  // Deploying DCAU on testnet...
  

  // creating dcau_usdc pair...
  console.log('creating dcau_usdc pair...')
  const dcau_usdc = await createPair(
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    DeployedTokens.dcau,
    DeployedTokens.usdc,
    getBigNumber(10000),
    getBigNumber(50000),
    alice.address,
    alice
  );

  // creating dcau_weth pair
  console.log('creating dcau_weth pair...');
  const dcau_weth = await createPairETH(
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    DeployedTokens.dcau,
    getBigNumber(10000),
    getBigNumber(5),
    alice.address,
    alice
  );

  const content = {
    dcau_usdc: dcau_usdc,
    dcau_weth: dcau_weth,
  };

  await fs.writeFileSync(
    "./scripts/args/pairs_dev.json",
    JSON.stringify(content),
    { flag: "w+" }
  );

  console.log("==END==");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
