// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../pool/IUniswapV2Factory.sol";

contract MockFactory is IUniswapV2Factory {
    mapping(address => mapping(address => address)) internal _pairs;
    address[] public override allPairs;

    function getPair(address tokenA, address tokenB) external view override returns (address) {
        return _pairs[tokenA][tokenB];
    }

    function allPairsLength() external view override returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        require(tokenA != tokenB, "UniswapV2: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "UniswapV2: ZERO_ADDRESS");
        require(_pairs[token0][token1] == address(0), "UniswapV2: PAIR_EXISTS");
        
        // Create a deterministic pair address
        pair = address(uint160(uint256(keccak256(abi.encodePacked(token0, token1, block.timestamp)))));
        _pairs[token0][token1] = pair;
        _pairs[token1][token0] = pair;
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
        return pair;
    }

    function setFeeTo(address) external override {
    }

    function setFeeToSetter(address) external override {
    }

    function feeTo() external pure override returns (address) {
        return address(0);
    }

    function feeToSetter() external pure override returns (address) {
        return address(0);
    }
} 