const fs = require("fs");
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { getBigNumber } = require("./shared");

require("dotenv").config();

/**
 * This script is only for testnet, don't use it on mainnet
 */
async function main() {
  const signers = await hre.ethers.getSigners();
  console.log(
    "Preparing ERC20 tokens and Writing result in tinyArgs/development.json..."
  );

  // Deploying DACU on testnet
  console.log("Deploying DACU...");
  const DCAUToken = await hre.ethers.getContractFactory("MockDCAU");
  const dcauToken = await DCAUToken.deploy(signers[0].address);
  await dcauToken.deployed();
  console.log("Deployed DCAU");

  // Deploying USDC, Link
  console.log("Deploying USDC, Link...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const usdcToken = await MockERC20.deploy(
    "USDC Token",
    "USDC",
    getBigNumber(1000000000)
  );
  const linkToken = await MockERC20.deploy(
    "Link Token",
    "LINK",
    getBigNumber(1000000000)
  );
  await usdcToken.deployed();
  await linkToken.deployed();
  console.log("Deployed USDC, Link");

  const content = {
    dcau: dcauToken.address,
    usdc: usdcToken.address,
  };

  await fs.writeFileSync(
    "./scripts/args/tokens_dev.json",
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
