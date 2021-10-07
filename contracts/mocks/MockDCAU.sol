// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockDGNG is ERC20("Dragon Crypto Aurum", "DACU"), Ownable {
    uint256 private _initialMint = 46300 * (10**18);
    uint256 private _limitAmount = 146300 * (10**18);

    constructor(address _dev) {
        _mint(_dev, _initialMint);
    }

    /// @notice Creates `_amount` token to `_to`. Must only be called by the owner (MasterChef).
    function mint(address _to, uint256 _amount) public onlyOwner {
        require(totalSupply() <= _limitAmount, "Dragon: Mint reached to limit");
        _mint(_to, _amount);
    }
}
