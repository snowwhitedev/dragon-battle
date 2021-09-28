// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev This contract includes dragon equipment types values and
 * validate equipment type function.
 */

import "./interfaces/IDragonEquipmentType.sol";

contract DragonEquipmentType is IDragonEquipmentType {
    // Equipment Types constants
    // Please make sure type = 0 means no equipment
    uint256 public override EQUIPMENT_BODY = 1;
    uint256 public override EQUIPMENT_ONE_HANDED = 2;
    uint256 public override EQUIPMENT_SHIELD = 3;
    uint256 public override EQUIPMENT_BOTH_HANDED = 4;

    constructor() {}

    function validateType(uint256 _type) public pure returns (bool) {
        if (_type == 0 || _type > 4) {
            return false;
        }
        return true;
    }
}
