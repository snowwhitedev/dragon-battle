// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Authorizable is Ownable {
    mapping(address => bool) public authorized;

    modifier onlyAuthorized() {
        require(authorized[msg.sender] || owner() == msg.sender);
        _;
    }

    function addAuthorized(address toAdd) public onlyOwner {
        authorized[toAdd] = true;
    }

    function removeAuthorized(address toRemove) public onlyOwner {
        require(toRemove != msg.sender);
        authorized[toRemove] = false;
    }
}
