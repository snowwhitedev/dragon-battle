const fs = require("fs");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { createPair, createPairETH } = require("./shared");

require("dotenv").config();

const ROUTER_ADDRESS = "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921"; // avalanche fuji
const FACTORY_ADDRESS = "0xE4A575550C2b460d2307b82dCd7aFe84AD1484dd"; // avalanche fuji

/**
 * This script is only for testnet, don't use it on mainnet
 */
async function main() {
  console.log(
    "Preparing ERC20 tokens and Writing result in scripts/args/tokens_dev.json..."
  );
  const signers = await ethers.getSigners();
  const alice = signers[0];

  // Deploying DCAU on testnet...
  console.log("Deploying DCAU...");
  const DCAUToken = await hre.ethers.getContractFactory("MockDCAU");
  const dcauToken = await DCAUToken.deploy();
  await dcauToken.deployed();
  console.log("Deployed DCAU");

  // Deploying USDC, Link
  console.log("Deploying USDC, Link...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdcToken = await MockERC20.deploy();
  const linkToken = await MockERC20.deploy();
  await usdcToken.deployed();
  await linkToken.deployed();
  console.log("Deployed USDC, Link");

  // creating dcau_usdc pair...
  const DCAU_USDC = await createPair(
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    dcauToken.address,
    usdcToken.address,
    getBigNumber(10000),
    getBigNumber(50000),
    alice.address,
    alice
  );

  // creating dcau_weth pair
  const DCAU_WETH = await createPairETH(
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    dcauToken.address,
    getBigNumber(10000),
    getBigNumber(5),
    alice.address,
    alice
  );

  const content = {
    dcau: dcauToken.address,
    usdc: usdcToken.address,
    dcau_usdc: DCAU_USDC,
    dcau_weth: dcau_weth,
  };

  await fs.writeFileSync(
    "./scripts/args/development.json",
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
