// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DragonResourceType.sol";

contract DragonResource is ERC1155, ReentrancyGuard, DragonResourceType {
    address payable private _devWallet;

    /**
     * @param _uri_ string such like "https://game.example/api/item/{id}.json"
     */
    constructor(string memory _uri_, address payable devWallet_) ERC1155(_uri_) {
        _devWallet = devWallet_;
        _mint(msg.sender, WOOD, 10**18, "");
        _mint(msg.sender, METAL, 10**18, "");
        _mint(msg.sender, LEATHER, 10**18, "");
        _mint(msg.sender, GEMSTONES, 10**18, "");
        _mint(msg.sender, COTTON, 10**18, "");
    }
}
