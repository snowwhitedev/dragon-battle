// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// const UniswapV2Pair = require('../scripts/abis/UniswapV2Pair.json');

// describe("Hardhaf folk", function () {
//   before(async function () {});

//   beforeEach(async function () {});

//   describe("Checking hardfolking", function () {
//     it("Checking WMATIC_WETH pair contract", async function () {
//       const pairContractAddress = "0xadbF1854e5883eB8aa7BAf50705338739e558E5b"; // WETH_WMATIC on mainnet
//       const contract = new ethers.Contract(pairContractAddress, JSON.stringify(UniswapV2Pair), ethers.provider);
//       const decimals = await contract.decimals();
//       expect(decimals).to.be.equal(18);

//       const token0 = await contract.token0(); // WMATIC on mainnet
//       console.log(token0.toString());
//       expect(token0).to.be.equal('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');

//       const token1 = await contract.token1(); // WETH on mainnet
//       console.log('token1]', token1);
//       expect(token1).to.be.equal('0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619');
//     })
//   });
// });
