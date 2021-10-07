// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash
// this script is for getting Metadata.json
// address _vaultChefAddress,
//         address _masterchefAddress,
//         address _uniRouterAddress,
//         uint256 _pid,
//         address _wantAddress, // the token which we want to put in pool
//         address _earnedAddress,
//         address[] memory _earnedToWmaticPath,
//         address[] memory _earnedToDgngPath,
//         address[] memory _earnedToToken0Path,
//         address[] memory _earnedToToken1Path

// dcau_usdc 0x35fd7926b4b8fde82c6218281db182b5fd452603
require('dotenv').config();

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // const _vaultChefAddress = await deployments.get('VaultChef');
  const vaultChefAddress = '0x2f868bC458f578958525B2780A0a3a713ee1270E';
  const masterchefAddress = '0xE21a3A7fB4fF125A55ff75e93F70a49C491F0Ca3';
  const uniRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  const pid = 4;
  const wantAddress = '0x35fd7926b4b8fde82c6218281db182b5fd452603';
  const earnedAddress = '0xaba6D7b5515f70402bFb2633B5446670B996c10b'; // dcau
  const usdcAddress = '0xF143436dE21a03c50267dBf64F2B7D6d14dEeA0F';
  const WETH = '0xc778417e063141139fce010982780140aa0cd5ab';
  await deploy('StrategyMasterChefLP', {
    from: deployer,
    log: true,
    args: [
      vaultChefAddress,
      masterchefAddress,
      uniRouterAddress,
      pid,
      wantAddress,
      earnedAddress,
      [earnedAddress, WETH],
      [earnedAddress, earnedAddress],
      [earnedAddress, earnedAddress],
      [earnedAddress, usdcAddress]
    ],
    deterministicDeployment: false,
  })
}

module.exports.tags = ['StrategyMasterChef', 'PolyDragon'];
