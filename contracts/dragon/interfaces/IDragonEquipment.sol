// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of DragonEquipmentType.
 */
interface IDragonEquipment {
    function typeOfItem(uint256 _tokenId) external view returns (uint8);

    function burn(
        address account,
        uint256 id,
        uint256 value
    ) external;

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) external;
}
