// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../interfaces/IUniPair.sol";
import "../interfaces/IUniRouter02.sol";

abstract contract BaseStrategy is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    address public wantAddress;
    address public token0Address;
    address public token1Address;
    address public earnedAddress;

    address public uniRouterAddress;
    address public constant dgngAddress = 0x3a3Df212b7AA91Aa0402B9035b098891d276572B;
    address public constant withdrawFeeAddress = 0x4879712c5D1A98C0B88Fb700daFF5c65d12Fd729;
    address public constant feeAddress = 0x1cb757f1eB92F25A917CE9a92ED88c1aC0734334;
    address public vaultChefAddress;
    address public govAddress;

    uint256 public lastEarnBlock = block.number;
    uint256 public sharesTotal = 0;

    address public constant buyBackAddress = 0x000000000000000000000000000000000000dEaD;
    uint256 public controllerFee = 50;
    uint256 public rewardRate = 0;
    uint256 public buyBackRate = 150;
    uint256 public constant feeMaxTotal = 1000;
    uint256 public constant feeMax = 10000; // 100 = 1%

    uint256 public withdrawFeeFactor = 10000; // 0% withdraw fee
    uint256 public constant withdrawFeeFactorMax = 10000;
    uint256 public constant withdrawFeeFactorLL = 9900;

    uint256 public slippageFactor = 950; // 5% default slippage tolerance
    uint256 public constant slippageFactorUL = 995;

    address[] public earnedToWmaticPath; // for distributeFee, DNGN_WMATIC path
    address[] public earnedToDgngPath; // for buyBack, do we need it?
    address[] public earnedToToken0Path; //
    address[] public earnedToToken1Path;
    address[] public token0ToEarnedPath;
    address[] public token1ToEarnedPath;

    event SetSettings(
        uint256 _controllerFee,
        uint256 _rewardRate,
        uint256 _buyBackRate,
        uint256 _withdrawFeeFactor,
        uint256 _slippageFactor,
        address _uniRouterAddress
    );

    modifier onlyGov() {
        require(msg.sender == govAddress, "!gov");
        _;
    }

    function _vaultDeposit(uint256 _amount) internal virtual;

    function _vaultWithdraw(uint256 _amount) internal virtual;

    function earn() external virtual;

    function vaultSharesTotal() public view virtual returns (uint256);

    function wantLockedTotal() public view virtual returns (uint256);

    function _resetAllowances() internal virtual;

    function _emergencyVaultWithdraw() internal virtual;

    function deposit(address _userAddress, uint256 _wantAmt) external onlyOwner nonReentrant whenNotPaused returns (uint256) {
        // Call must happen before transfer
        uint256 wantLockedBefore = wantLockedTotal();

        IERC20(wantAddress).safeTransferFrom(address(msg.sender), address(this), _wantAmt);

        // Proper deposit amount for tokens with fees, or vaults with deposit fees
        uint256 sharesAdded = _farm();
        if (sharesTotal > 0) {
            sharesAdded = (sharesAdded * sharesTotal) / wantLockedBefore;
        }
        sharesTotal = sharesTotal + sharesAdded;

        return sharesAdded;
    }

    function _farm() internal returns (uint256) {
        uint256 wantAmt = IERC20(wantAddress).balanceOf(address(this));
        if (wantAmt == 0) return 0;

        uint256 sharesBefore = vaultSharesTotal();
        _vaultDeposit(wantAmt);
        uint256 sharesAfter = vaultSharesTotal();

        return sharesAfter - sharesBefore;
    }

    function withdraw(address _userAddress, uint256 _wantAmt) external onlyOwner nonReentrant returns (uint256) {
        require(_wantAmt > 0, "_wantAmt is 0");

        uint256 wantAmt = IERC20(wantAddress).balanceOf(address(this));

        // Check if strategy has tokens from panic
        if (_wantAmt > wantAmt) {
            _vaultWithdraw(_wantAmt - wantAmt);
            wantAmt = IERC20(wantAddress).balanceOf(address(this));
        }

        if (_wantAmt > wantAmt) {
            _wantAmt = wantAmt;
        }

        if (_wantAmt > wantLockedTotal()) {
            _wantAmt = wantLockedTotal();
        }

        uint256 sharesRemoved = (_wantAmt * sharesTotal) / wantLockedTotal();
        if (sharesRemoved > sharesTotal) {
            sharesRemoved = sharesTotal;
        }
        sharesTotal = sharesTotal - sharesRemoved;

        // Withdraw fee
        uint256 withdrawFee = (_wantAmt * (withdrawFeeFactorMax - withdrawFeeFactor)) / withdrawFeeFactorMax;
        if (withdrawFee > 0) {
            IERC20(wantAddress).safeTransfer(withdrawFeeAddress, withdrawFee);
        }

        _wantAmt = _wantAmt - withdrawFee;

        IERC20(wantAddress).safeTransfer(vaultChefAddress, _wantAmt);

        return sharesRemoved;
    }

    // To pay for earn function
    function distributeFees(uint256 _earnedAmt) internal returns (uint256) {
        if (controllerFee > 0) {
            uint256 fee = (_earnedAmt * controllerFee) / feeMax;
            _safeSwapWmatic(fee, earnedToWmaticPath, feeAddress);
            _earnedAmt = _earnedAmt - fee;
        }

        return _earnedAmt;
    }

    function buyBack(uint256 _earnedAmt) internal virtual returns (uint256) {
        if (earnedAddress == dgngAddress) {
            return _earnedAmt;
        }
        if (buyBackRate > 0) {
            uint256 buyBackAmt = (_earnedAmt * buyBackRate) / feeMax;
            if (earnedAddress != dgngAddress) {
                _safeSwap(buyBackAmt, earnedToDgngPath, buyBackAddress);
            }
            _earnedAmt = _earnedAmt - buyBackAmt;
        }

        return _earnedAmt;
    }

    function resetAllowances() external onlyGov {
        _resetAllowances();
    }

    function pause() external onlyGov {
        _pause();
    }

    function unpause() external onlyGov {
        _unpause();
        _resetAllowances();
    }

    function panic() external onlyGov {
        _pause();
        _emergencyVaultWithdraw();
    }

    function unpanic() external onlyGov {
        _unpause();
        _farm();
    }

    function setGov(address _govAddress) external onlyGov {
        govAddress = _govAddress;
    }

    function setSettings(
        uint256 _controllerFee,
        uint256 _rewardRate,
        uint256 _buyBackRate,
        uint256 _withdrawFeeFactor,
        uint256 _slippageFactor,
        address _uniRouterAddress
    ) external onlyGov {
        require(_controllerFee + _rewardRate + _buyBackRate <= feeMaxTotal, "Max fee of 10%");
        require(_withdrawFeeFactor >= withdrawFeeFactorLL, "_withdrawFeeFactor too low");
        require(_withdrawFeeFactor <= withdrawFeeFactorMax, "_withdrawFeeFactor too high");
        require(_slippageFactor <= slippageFactorUL, "_slippageFactor too high");
        controllerFee = _controllerFee;
        rewardRate = _rewardRate;
        buyBackRate = _buyBackRate;
        withdrawFeeFactor = _withdrawFeeFactor;
        slippageFactor = _slippageFactor;
        uniRouterAddress = _uniRouterAddress;

        emit SetSettings(_controllerFee, _rewardRate, _buyBackRate, _withdrawFeeFactor, _slippageFactor, _uniRouterAddress);
    }

    function _safeSwap(
        uint256 _amountIn,
        address[] memory _path,
        address _to
    ) internal {
        uint256[] memory amounts = IUniRouter02(uniRouterAddress).getAmountsOut(_amountIn, _path);
        uint256 amountOut = amounts[amounts.length - 1];

        IUniRouter02(uniRouterAddress).swapExactTokensForTokens(
            _amountIn,
            (amountOut * slippageFactor) / 1000,
            _path,
            _to,
            block.timestamp + 600
        );
    }

    function _safeSwapWmatic(
        uint256 _amountIn,
        address[] memory _path,
        address _to
    ) internal {
        uint256[] memory amounts = IUniRouter02(uniRouterAddress).getAmountsOut(_amountIn, _path);
        uint256 amountOut = amounts[amounts.length - 1];

        IUniRouter02(uniRouterAddress).swapExactTokensForETH(
            _amountIn,
            (amountOut * slippageFactor) / 1000,
            _path,
            _to,
            block.timestamp + 600
        );
    }
}
