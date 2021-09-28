// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../libraries/Authorizable.sol";
import "./interfaces/IDragonEquipment.sol";
import "./interfaces/IDragonEquipmentType.sol";

// import "hardhat/console.sol";

contract DragonPlayerCharacter is ERC721URIStorage, Authorizable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address payable private _feeAddress;
    uint256 private _characterPrice = 5; // 5 DGNG token

    address public immutable DGNG_TOKEN;
    uint256 public constant START_STAT_POINTS = 12;
    uint256 public constant HEALTH_MULTIPLIER = 100;
    uint256 public constant START_LEVEL = 1;
    uint256 public constant START_EXP = 0;
    uint256 public constant BASE_EXP_TO_LEVEL = 2500;
    uint256 public constant STAT_POINTS_PER_LEVEL = 4;

    address public immutable DRAGON_EQUIPMENT;

    /** Dragon stats */
    struct Dragon {
        uint256 attack;
        uint256 defense;
        uint256 speed;
        uint256 endurance;
        uint256 luck;
        uint256 experience;
        uint256 level;
        uint256 currentHealth;
        uint256 totalHealth;
        uint256 created;
        uint256 statPointsToSpend;
        uint256 equipmentBody; // Equipment token ID, should be body type
        uint256 equipmentHand1; // Equipment token ID, should be hand1 type
        uint256 equipmentHand2; // Equipment token ID, should be hand2 type
        uint256 equipmentBoth; // Equipment token ID, should be both hand type
        bool isAlive;
    }
    mapping(uint256 => Dragon) private dragonPlayers; // characterId => Dragon
    mapping(uint256 => mapping(uint8 => uint256)) private dragonResources; // characterId => Dragon

    constructor(
        address _DGNG,
        address payable _feeAddress_,
        address _DRAGON_EQUIPMENT
    ) ERC721("Dragon Player Character", "DPC") {
        require(_DGNG != address(0) && _feeAddress_ != address(0) && _DRAGON_EQUIPMENT != address(0), "Dragon: ZERO_ADDRESS");
        DGNG_TOKEN = _DGNG;
        _feeAddress = _feeAddress_;
        DRAGON_EQUIPMENT = _DRAGON_EQUIPMENT;
    }

    function characterPrice() public view returns (uint256) {
        return _characterPrice;
    }

    function mintCharacter(
        string memory tokenURI,
        uint256 attack,
        uint256 defense,
        uint256 speed,
        uint256 endurance
    ) external onlyOwner nonReentrant returns (uint256) {
        require(attack + defense + speed + endurance == START_STAT_POINTS, "Dragon: Invalid stats");
        IERC20(DGNG_TOKEN).transferFrom(msg.sender, _feeAddress, 5 * (10**IERC20Metadata(DGNG_TOKEN).decimals()));

        uint256 startHealth = endurance * HEALTH_MULTIPLIER;

        uint256 newItemId = _tokenIds.current();
        dragonPlayers[newItemId] = Dragon({
            attack: attack,
            defense: defense,
            speed: speed,
            endurance: endurance,
            luck: 0,
            experience: START_EXP,
            level: START_LEVEL,
            totalHealth: startHealth,
            currentHealth: startHealth,
            created: block.timestamp,
            statPointsToSpend: 0,
            equipmentBody: 0,
            equipmentHand1: 0, // Equipment token ID, should be hand1 type
            equipmentHand2: 0, // Equipment token ID, should be hand2 type
            equipmentBoth: 0,
            isAlive: true
        });
        _mint(address(this), newItemId);
        _setTokenURI(newItemId, tokenURI);
        _tokenIds.increment();

        return newItemId;
    }

    function heal(uint256 characterId) public onlyAuthorized {
        dragonPlayers[characterId].currentHealth = dragonPlayers[characterId].totalHealth;
    }

    function resurrect(uint256 characterId) public onlyAuthorized {
        heal(characterId);
        dragonPlayers[characterId].isAlive = true;
    }

    function addExperience(uint256 characterId, uint256 experienceAmount) public onlyAuthorized {
        Dragon memory character = dragonPlayers[characterId];

        uint256 experienceToNextLevel = character.level * BASE_EXP_TO_LEVEL;
        uint256 newExperience = character.experience + experienceAmount;

        if (newExperience >= experienceToNextLevel) {
            uint256 experienceLeftOver = experienceToNextLevel - newExperience;
            dragonPlayers[characterId].experience = experienceLeftOver;
            dragonPlayers[characterId].level++;
            dragonPlayers[characterId].statPointsToSpend += STAT_POINTS_PER_LEVEL;
        } else {
            dragonPlayers[characterId].experience = newExperience;
        }
    }

    // TODO set equipments
    function addEquipment(
        uint256 _playerId,
        uint256 _body,
        uint256 _hand1,
        uint256 _hand2,
        uint256 _both
    ) external nonReentrant {
        require(ownerOf(_playerId) == msg.sender, "Dragon: Forbidden");
        require(_validateEquipment(_body, _hand1, _hand2, _both), "Dragon: Invalid item combination");

        // TODO Transfer DragonEquipment - ERC1155 to PlayerCharacter or Burn?
        // For now let's assume burn
        uint256[] memory _burnIds = new uint256[](4);
        _burnIds[0] = _body;
        _burnIds[1] = _hand1;
        _burnIds[2] = _hand2;
        _burnIds[3] = _both;

        uint256[] memory _amounts = new uint256[](4);
        _amounts[0] = _amounts[1] = _amounts[2] = _amounts[3] = 1;
        IDragonEquipment(DRAGON_EQUIPMENT).burnBatch(msg.sender, _burnIds, _amounts);

        Dragon storage _dragon = dragonPlayers[_playerId];
        _dragon.equipmentBody = _body;
        _dragon.equipmentHand1 = _hand1;
        _dragon.equipmentHand2 = _hand2;
        _dragon.equipmentBoth = _both;
    }

    function _validateEquipment(
        uint256 _body,
        uint256 _hand1,
        uint256 _hand2,
        uint256 _both
    ) private view returns (bool) {
        IDragonEquipment _dgEquip = IDragonEquipment(DRAGON_EQUIPMENT);
        IDragonEquipmentType _dgEquipType = IDragonEquipmentType(DRAGON_EQUIPMENT);

        // Each equipment should be equiped in proper place
        if (
            _dgEquip.typeOfItem(_body) != _dgEquipType.EQUIPMENT_BODY() ||
            _dgEquip.typeOfItem(_hand1) != _dgEquipType.EQUIPMENT_ONE_HANDED() ||
            _dgEquip.typeOfItem(_hand2) != _dgEquipType.EQUIPMENT_SHIELD() ||
            _dgEquip.typeOfItem(_both) != _dgEquipType.EQUIPMENT_BOTH_HANDED()
        ) {
            return false;
        }

        // Both handed item can not be equiped with any one handed weapon
        if ((_hand1 != 0 || _hand2 != 0) && _both != 0) {
            return false;
        }
        return true;
    }

    // TODO Resource staff in next stage
    function addSingleResource() public {}

    function setCharacterPrice(uint256 _price) external onlyOwner {
        _characterPrice = _price;
    }
}
