// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash
require('dotenv').config();
const deployedTokens = require('../scripts/args/tokens_dev.json');
const { getBigNumber } = require('../scripts/shared');

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const dragonUtility = await deployments.get('DragonUtility');
  const dcau = process.env.PRODUCTION_MODE === 'development' ? deployedTokens.dcau : '0xmainnet dcau address here';
  const feeAddress = process.env.PRODUCTION_MODE === 'development' ? '0x6C641CE6A7216F12d28692f9d8b2BDcdE812eD2b' : '0xmainnet address here';
  const startTime = process.env.PRODUCTION_MODE === 'development' ? ~~(new Date().getTime / 1000) : 'mainnet time here';
  const dcauPerBlock = getBigNumber(5, 16); // 0.05 dcau
  const devWallet = process.env.PRODUCTION_MODE === 'development' ? '0x6C641CE6A7216F12d28692f9d8b2BDcdE812eD2b' : '0xmainnet address here';
  await deploy('MasterChef', {
    from: deployer,
    log: true,
    args: [dcau, dragonUtility.address, feeAddress, startTime, dcauPerBlock, devWallet],
    deterministicDeployment: false,
  })
}

module.exports.tags = ['MasterChef', 'PolyDragon'];
module.exports.dependencies = ['DragonUtility'];
