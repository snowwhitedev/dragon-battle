const { ethers } = require("hardhat");
const { BigNumber } = ethers;

const DGNG_TOTAL_SUPPLY = 146300;
const DGNG_PRE_MINT = 46300;

/**
* DGNG (0% deposit) (50X multiplier) (also an auto compounding vault)
* WETH (4% deposit) (5X multiplier)
* WBTC (4% deposit) (5X multiplier)
* WMATIC (4% deposit) (5X multiplier)
* USDC (4% deposit) (5X multiplier)
* DAI (4% deposit) (5X multiplier)
* LINK (3% deposit) (7.5X multiplier)
* POLYPUP BALL (3% deposit) (7.5X multiplier)
* POLYPUP BONE (4% deposit) (5X multiplier)
* POLYDOGE (4% deposit) (5X multiplier)

* Farms (QUICKSWAP LP Pools)

* DGNG/WMATIC (0% deposit) (100X multiplier) (also an auto compounding vault)
* DGNG/USDC (0% deposit) (100X multiplier) (also an auto compounding vault)
* DAI/USDC (4% deposit) (10X multiplier)
* POLYPUP BALL/USDC (3% deposit) (15X multiplier)
*/

const MockERC20Assets = [
  { name: "Mock WETH", symbol: "MockWETH" },
  { name: "Mock WBTC", symbol: "MockWBTC" },
  { name: "Mock USDC", symbol: "MockUSDC" },
  { name: "Mock DAI", symbol: "MockDAI" },
  { name: "Mock Link", symbol: "MockLINK" },
  { name: "Mock POLYPUP BALL", symbol: "MockPLPBALL" },
  { name: "Mock POLYPUP BONE", symbol: "MockPLPBONE" },
  { name: "Mock POLYDOGE", symbol: "MockPLDOGE" },
];

const MockWMATIC = {
  name: "Mock WMATIC",
  symbol: "MockWMATIC",
};

// const ADDRESS_ZERO = ethers.utils.getAddress('0');

// Quick Swap addresses
const QUICK_SWAP = {
  ROUTER: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
  FACTORY: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
};

const WETH = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // on polygon
// const WETH = "0xc778417e063141139fce010982780140aa0cd5ab "; // on rinkeby

const UniswapV2Router = require("./abis/UniswapV2Router.json");
const UniswapV2Factory = require("./abis/UniswapV2Factory.json");
const ERC20 = require("./abis/ERC20.json");

// function getUniswapV2Router(routerAddress) {
//   const contract = new ethers.Contract(routerAddress, JSON.stringify(UniswapV2Router), ethers.provider);
//   return contract;
// }

// function getUniswapV2Factory(factoryAddress) {
//   const contract = new ethers.Contract(factoryAddress, JSON.stringify(UniswapV2Factory), ethers.provider);
//   return contract;
// }

function getContract(address, abi) {
  return new ethers.Contract(address, abi, ethers.provider);
}

async function createPair(
  router,
  factory,
  token0,
  token1,
  amount0,
  amount1,
  to,
  signer
) {
  const deadline = new Date().getTime();
  const routerContract = getContract(router, JSON.stringify(UniswapV2Router));
  const factoryContract = getContract(
    factory,
    JSON.stringify(UniswapV2Factory)
  );
  const token0Contract = getContract(token0, JSON.stringify(ERC20));
  const token1Contract = getContract(token1, JSON.stringify(ERC20));

  console.log("Approving router to consume tokens...");
  await (
    await token0Contract
      .connect(signer)
      .approve(router, getBigNumber(10000000000), { from: signer.address })
  ).wait();
  await (
    await token1Contract
      .connect(signer)
      .approve(router, getBigNumber(10000000000), { from: signer.address })
  ).wait();
  console.log("Approved.");

  console.log("Addding liquidity...");
  await (
    await routerContract
      .connect(signer)
      .addLiquidity(
        token0,
        token1,
        amount0,
        amount1,
        amount0,
        amount1,
        to,
        deadline,
        { from: signer.address }
      )
  ).wait();

  const pair = await factoryContract.getPair(token0, token1);

  return pair;
}

async function createPairETH(
  router,
  factory,
  token0,
  amount0,
  amount1,
  to,
  signer
) {
  const deadline = new Date().getTime();
  const routerContract = getContract(router, JSON.stringify(UniswapV2Router));
  const factoryContract = getContract(
    factory,
    JSON.stringify(UniswapV2Factory)
  );
  const token0Contract = getContract(token0, JSON.stringify(ERC20));

  console.log("Approving router to consume tokens...");
  await (
    await token0Contract
      .connect(signer)
      .approve(router, getBigNumber(10000000000), { from: signer.address })
  ).wait();
  console.log("Approved.");

  console.log("Addding liquidity...");
  await (
    await routerContract
      .connect(signer)
      .addLiquidityETH(token0, amount0, amount0, amount1, to, deadline, {
        value: amount1,
      })
  ).wait();

  const pair = await factoryContract.getPair(token0, WETH);

  return pair;
}

function getBigNumber(amount, decimal = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimal));
}

async function advanceBlock() {
  return ethers.provider.send("evm_mine", []);
}

async function advanceBlockTo(blockNumber) {
  for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
    await advanceBlock();
  }
}

module.exports = {
  DGNG_TOTAL_SUPPLY,
  DGNG_PRE_MINT,
  QUICK_SWAP,
  WETH,
  getBigNumber,
  advanceBlock,
  advanceBlockTo,
  createPair,
  createPairETH,
  getContract,
};
