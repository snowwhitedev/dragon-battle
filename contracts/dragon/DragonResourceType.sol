// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev This contract includes dragon resource type and
 * validate resource type function.
 */

import "./interfaces/IDragonResourceType.sol";

contract DragonResourceType is IDragonResourceType {
    // Resources Type constants - These constants should be token id in DragonResources contract
    uint256 public constant override WOOD = 0;
    uint256 public constant override METAL = 1;
    uint256 public constant override LEATHER = 2;
    uint256 public constant override GEMSTONES = 3;
    uint256 public constant override COTTON = 4;

    function validateType(uint256 _type) external pure override returns (bool) {
        if (_type == 0 || _type > 4) {
            return false;
        }

        return true;
    }
}
