// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of DragonEquipmentType.
 */
interface IDragonEquipmentType {
    function EQUIPMENT_BODY() external view returns (uint256);

    function EQUIPMENT_ONE_HANDED() external view returns (uint256);

    function EQUIPMENT_SHIELD() external view returns (uint256);

    function EQUIPMENT_BOTH_HANDED() external view returns (uint256);
}
