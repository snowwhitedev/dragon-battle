// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/TransferHelper.sol";

// import "hardhat/console.sol";

contract DragonUtility is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    address public immutable USDC;
    address payable private _devWallet;
    uint256 private _itemCost;

    constructor(address payable devWallet_, address _USDC) ERC721("Dragon Utility", "DGU") {
        _devWallet = devWallet_;
        USDC = _USDC;
    }

    function devWallet() public view returns (address) {
        return _devWallet;
    }

    function itemCost() public view returns (uint256) {
        return _itemCost;
    }

    function mintPlank(string memory tokenURI) external onlyOwner returns (uint256) {
        require(_tokenIds.current() < 25, "All tokens have been minted");

        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(address(this), newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }

    function buyDragonUtility(uint256 _tokenId) external nonReentrant {
        require(balanceOf(_msgSender()) < 2, "Dragon:Forbidden");
        TransferHelper.safeTransferFrom(USDC, _msgSender(), _devWallet, _itemCost);

        _safeTransfer(address(this), msg.sender, _tokenId, "");
    }

    function setItemCost(uint256 _cost) external onlyOwner {
        _itemCost = _cost;
    }
}
