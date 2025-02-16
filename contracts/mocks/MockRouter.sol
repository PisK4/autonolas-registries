// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../pool/IUniswapV2Router02.sol";
import "../pool/IUniswapV2Factory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRouter is IUniswapV2Router02 {
    address private immutable _factory;
    address private immutable _weth;
    address public mockPair;

    constructor(address factory_) {
        _factory = factory_;
        _weth = address(this);
    }

    function factory() external view override returns (address) {
        return _factory;
    }

    function WETH() external view override returns (address) {
        return _weth;
    }

    function setMockPair(address pair) external {
        mockPair = pair;
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
    ) external override returns (uint amountA, uint amountB, uint liquidity) {
        IERC20(tokenA).transferFrom(msg.sender, mockPair, amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, mockPair, amountBDesired);
        
        amountA = amountADesired;
        amountB = amountBDesired;
        liquidity = amountADesired;
        return (amountA, amountB, liquidity);
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable override returns (uint amountToken, uint amountETH, uint liquidity) {
        return (0, 0, 0);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external override returns (uint amountA, uint amountB) {
        return (0, 0);
    }

    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external override returns (uint amountToken, uint amountETH) {
        return (0, 0);
    }

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external override returns (uint amountA, uint amountB) {
        return (0, 0);
    }

    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external override returns (uint amountToken, uint amountETH) {
        return (0, 0);
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        result[0] = amountIn;
        result[1] = amountIn;
        return result;
    }

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        uint[] memory result = new uint[](path.length);
        return result;
    }

    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        override
        returns (uint[] memory amounts)
    {
        uint[] memory result = new uint[](path.length);
        return result;
    }

    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        override
        returns (uint[] memory amounts)
    {
        uint[] memory result = new uint[](path.length);
        return result;
    }

    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        override
        returns (uint[] memory amounts)
    {
        uint[] memory result = new uint[](path.length);
        return result;
    }

    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        override
        returns (uint[] memory amounts)
    {
        uint[] memory result = new uint[](path.length);
        return result;
    }

    function quote(uint amountA, uint reserveA, uint reserveB) external pure override returns (uint amountB) {
        return amountA;
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)
        external
        pure
        override
        returns (uint amountOut)
    {
        return amountIn;
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
        external
        pure
        override
        returns (uint amountIn)
    {
        return amountOut;
    }

    function getAmountsOut(uint amountIn, address[] calldata path)
        external
        view
        override
        returns (uint[] memory amounts)
    {
        uint[] memory result = new uint[](path.length);
        result[0] = amountIn;
        result[1] = amountIn;
        return result;
    }

    function getAmountsIn(uint amountOut, address[] calldata path)
        external
        view
        override
        returns (uint[] memory amounts)
    {
        uint[] memory result = new uint[](path.length);
        return result;
    }

    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external override returns (uint amountETH) {
        return 0;
    }

    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external override returns (uint amountETH) {
        return 0;
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {
        IERC20(path[0]).transferFrom(msg.sender, to, amountIn);
    }

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override {
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {
    }

    function getPair(address tokenA, address tokenB) external view returns (address) {
        return mockPair;
    }
} 