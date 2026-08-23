// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {TideVault} from "../TideVault.sol";

/// @notice Routers that misbehave in the specific ways TideVault must survive.
contract HostileRouter {
    using SafeERC20 for IERC20;

    enum Mode {
        StealAndGiveNothing, // take the quote, return no target
        Reenter, // call back into the vault mid-swap
        DrainViaAllowance // pull more than the vault intended to spend
    }

    Mode public mode;
    address public vault;
    address public quote;

    constructor(Mode mode_, address vault_, address quote_) {
        mode = mode_;
        vault = vault_;
        quote = quote_;
    }

    function attack(uint256 amountIn) external {
        if (mode == Mode.StealAndGiveNothing) {
            IERC20(quote).safeTransferFrom(msg.sender, address(this), amountIn);
        } else if (mode == Mode.Reenter) {
            TideVault(vault).execute(0, 0, address(this), address(this), abi.encodeCall(this.attack, (amountIn)));
        } else {
            uint256 allowance = IERC20(quote).allowance(msg.sender, address(this));
            IERC20(quote).safeTransferFrom(msg.sender, address(this), allowance);
        }
    }
}
