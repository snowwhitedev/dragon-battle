// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of DragonResourceType.
 */
interface IDragonResourceType {
    function WOOD() external view returns (uint256);

    function METAL() external view returns (uint256);

    function LEATHER() external view returns (uint256);

    function GEMSTONES() external view returns (uint256);

    function COTTON() external view returns (uint256);

    function validateType(uint256 _type) external pure returns (bool);
}
