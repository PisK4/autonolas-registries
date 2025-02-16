// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {}

    function initialize(bytes calldata) external pure returns (bool) {
        // Mock initialization that always succeeds
        return true;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 