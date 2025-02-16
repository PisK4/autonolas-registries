// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract MockRouter  {
    address public factory;
    address public WETH;

    constructor() {
        factory = address(this);
        WETH = address(this);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        // Mock implementation that returns the desired amounts
        return (amountADesired, amountBDesired, amountADesired);
    }

    function createPair(address tokenA, address tokenB) external pure returns (address) {
        // Return a deterministic address based on inputs
        return address(uint160(uint256(keccak256(abi.encodePacked(tokenA, tokenB)))));
    }

    function getPair(address tokenA, address tokenB) external pure returns (address) {
        // Return zero address to simulate non-existent pair
        return address(0);
    }
} 