// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DragonEquipmentType.sol";

// import "./interfaces/IDragonEquipment.sol";

contract DragonEquipment is ERC1155Burnable, Ownable, ReentrancyGuard, DragonEquipmentType {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address payable private _devWallet;

    mapping(uint256 => uint8) private _itemType;

    event EquipmentCreated(address indexed _creator, uint256 indexed _type, uint256 _tokenId, uint256 _amount);

    /**
     * @param _uri_ string such like "https://game.example/api/item/{id}.json"
     */
    constructor(string memory _uri_, address payable devWallet_) ERC1155(_uri_) {
        _devWallet = devWallet_;
    }

    function typeOfItem(uint256 _tokenId) public view returns (uint8) {
        return _itemType[_tokenId];
    }

    function mintNewEquipment(uint256 _type, uint256 _amount) external onlyOwner nonReentrant {
        require(validateType(_type), "Dragon: Invalid equipment type");
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        _mint(_msgSender(), newItemId, _amount, "");

        _itemType[newItemId] = uint8(_type);
        emit EquipmentCreated(msg.sender, _type, newItemId, _amount);
    }
}
