// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * This strategy is for the liquidity pair asset in MasterChef
 */

import "./interfaces/IMasterChef.sol";
import "./BaseStrategyLPSingle.sol";

contract StrategyMasterChefLP is BaseStrategyLPSingle {
    using SafeERC20 for IERC20;

    address public masterchefAddress;
    uint256 public pid; // MasterChef pool id

    constructor(
        address _vaultChefAddress,
        address _masterchefAddress,
        address _uniRouterAddress,
        uint256 _pid,
        address _wantAddress, // the token which we want to put in pool
        address _earnedAddress,
        address[] memory _earnedToWmaticPath,
        address[] memory _earnedToDgngPath,
        address[] memory _earnedToToken0Path,
        address[] memory _earnedToToken1Path
    ) {
        govAddress = msg.sender;
        vaultChefAddress = _vaultChefAddress;
        masterchefAddress = _masterchefAddress;
        uniRouterAddress = _uniRouterAddress;

        wantAddress = _wantAddress;
        token0Address = IUniPair(wantAddress).token0();
        token1Address = IUniPair(wantAddress).token1();

        pid = _pid;
        earnedAddress = _earnedAddress;

        earnedToWmaticPath = _earnedToWmaticPath;
        earnedToDgngPath = _earnedToDgngPath;
        earnedToToken0Path = _earnedToToken0Path;
        earnedToToken1Path = _earnedToToken1Path;

        transferOwnership(vaultChefAddress);

        _resetAllowances();
    }

    function _vaultDeposit(uint256 _amount) internal override {
        IMasterchef(masterchefAddress).deposit(pid, _amount);
    }

    function _vaultWithdraw(uint256 _amount) internal override {
        IMasterchef(masterchefAddress).withdraw(pid, _amount);
    }

    function _vaultHarvest() internal override {
        IMasterchef(masterchefAddress).withdraw(pid, 0);
    }

    function vaultSharesTotal() public view override returns (uint256) {
        (uint256 amount, ) = IMasterchef(masterchefAddress).userInfo(pid, address(this));
        return amount;
    }

    function wantLockedTotal() public view override returns (uint256) {
        return IERC20(wantAddress).balanceOf(address(this)) + vaultSharesTotal();
    }

    function _resetAllowances() internal override {
        IERC20(wantAddress).safeApprove(masterchefAddress, uint256(0));
        IERC20(wantAddress).safeIncreaseAllowance(masterchefAddress, type(uint256).max);

        IERC20(earnedAddress).safeApprove(uniRouterAddress, uint256(0));
        IERC20(earnedAddress).safeIncreaseAllowance(uniRouterAddress, type(uint256).max);

        IERC20(token0Address).safeApprove(uniRouterAddress, uint256(0));
        IERC20(token0Address).safeIncreaseAllowance(uniRouterAddress, type(uint256).max);

        IERC20(token1Address).safeApprove(uniRouterAddress, uint256(0));
        IERC20(token1Address).safeIncreaseAllowance(uniRouterAddress, type(uint256).max);
    }

    function _emergencyVaultWithdraw() internal override {
        IMasterchef(masterchefAddress).emergencyWithdraw(pid);
    }
}
