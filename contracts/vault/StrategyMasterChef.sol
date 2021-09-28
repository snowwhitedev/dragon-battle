// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * This strategy is for the single asset in MasterChef
 */

import "./interfaces/IMasterChef.sol";
import "./BaseStrategy.sol";

contract StrategyMasterChef is BaseStrategy {
    using SafeERC20 for IERC20;

    address public masterchefAddress;
    uint256 public pid;

    constructor(
        address _vaultChefAddress,
        address _masterchefAddress,
        address _uniRouterAddress,
        uint256 _pid,
        address _wantAddress, // the token which we want to put in pool
        address _earnedAddress,
        address[] memory _earnedToWmaticPath
    ) {
        govAddress = msg.sender;
        vaultChefAddress = _vaultChefAddress;
        masterchefAddress = _masterchefAddress;
        uniRouterAddress = _uniRouterAddress;

        wantAddress = _wantAddress;

        pid = _pid;
        earnedAddress = _earnedAddress;

        earnedToWmaticPath = _earnedToWmaticPath;

        transferOwnership(vaultChefAddress);
        _resetAllowances();
    }

    function earn() external override nonReentrant whenNotPaused onlyGov {
        // Harvest farm tokens
        _vaultHarvest();

        // Converts farm tokens into want tokens
        uint256 earnedAmt = IERC20(earnedAddress).balanceOf(address(this));

        if (earnedAmt > 0) {
            earnedAmt = distributeFees(earnedAmt);
            earnedAmt = buyBack(earnedAmt);

            if (earnedAddress != wantAddress) {
                // Swap half earned to wantAddress
                address[] memory path;
                path[0] = earnedAddress;
                path[1] = wantAddress;
                _safeSwap(earnedAmt / 2, path, address(this));
            }
            lastEarnBlock = block.number;
            _farm();
        }
    }

    function _vaultDeposit(uint256 _amount) internal override {
        IMasterchef(masterchefAddress).deposit(pid, _amount);
    }

    function _vaultWithdraw(uint256 _amount) internal override {
        IMasterchef(masterchefAddress).withdraw(pid, _amount);
    }

    function _vaultHarvest() internal {
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
    }

    function _emergencyVaultWithdraw() internal override {
        IMasterchef(masterchefAddress).emergencyWithdraw(pid);
    }
}
