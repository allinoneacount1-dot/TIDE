// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MockERC20} from "./MockERC20.sol";

/// @notice A DEX router with real swap semantics for tests and the local devnet.
/// @dev Unlike a stub that simply mints to the caller, this actually pulls the quote
///      asset through the allowance the vault granted. That difference matters: a
///      mock that never spends the input will happily pass an accounting bug that
///      loses real funds on mainnet.
contract MockRouter {
    using SafeERC20 for IERC20;

    /// @notice Quote units per whole target unit, 1e8 scale. e.g. 18_240000000 = $182.40
    uint256 public price;
    uint8 public immutable quoteDecimals;
    uint8 public immutable targetDecimals;

    /// @notice Basis points of the fair output withheld, to simulate real slippage.
    uint16 public slippageBps;
    bool public shouldRevert;
    /// @notice When set, pull the full allowance rather than the requested amount.
    bool public overspend;

    error RouterReverted();

    constructor(uint8 quoteDecimals_, uint8 targetDecimals_, uint256 price_) {
        quoteDecimals = quoteDecimals_;
        targetDecimals = targetDecimals_;
        price = price_;
    }

    function setPrice(uint256 p) external {
        price = p;
    }

    function setSlippageBps(uint16 bps) external {
        slippageBps = bps;
    }

    function setShouldRevert(bool v) external {
        shouldRevert = v;
    }

    function setOverspend(bool v) external {
        overspend = v;
    }

    /// @notice Quote the output for a given input at the current price.
    function quoteOut(uint256 amountIn) public view returns (uint256) {
        uint256 fair = (amountIn * (10 ** uint256(targetDecimals)) * 1e8) / ((10 ** uint256(quoteDecimals)) * price);
        return (fair * (10_000 - slippageBps)) / 10_000;
    }

    /// @notice Swap `amountIn` of `tokenIn` for `tokenOut`, sending output to the caller.
    function swap(address tokenIn, address tokenOut, uint256 amountIn, address recipient) external {
        if (shouldRevert) revert RouterReverted();

        uint256 pull = amountIn;
        if (overspend) {
            uint256 allowance = IERC20(tokenIn).allowance(msg.sender, address(this));
            if (allowance > pull) pull = allowance;
        }

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), pull);
        MockERC20(tokenOut).mint(recipient, quoteOut(amountIn));
    }
}
