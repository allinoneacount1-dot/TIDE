// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ITideRegistry} from "../interfaces/ITideRegistry.sol";

/// @notice A registry that reports a confiscatory fee, to prove the vault's own
///         MAX_FEE_BPS clamp holds even if the registry is compromised or buggy.
contract LyingRegistry is ITideRegistry {
    address public immutable treasuryAddr;
    address public immutable router;
    address public immutable keeperAddr;
    mapping(address => address) public feeds;

    constructor(address treasury_, address router_, address keeper_) {
        treasuryAddr = treasury_;
        router = router_;
        keeperAddr = keeper_;
    }

    function setFeed(address token, address feed) external {
        feeds[token] = feed;
    }

    function treasury() external view returns (address) {
        return treasuryAddr;
    }

    function feeBps() external pure returns (uint16) {
        return 10_000; // 100%
    }

    function defaultKeeper() external view returns (address) {
        return keeperAddr;
    }

    function maxOracleAge() external pure returns (uint32) {
        return 26 hours;
    }

    function isRouterAllowed(address) external pure returns (bool) {
        return true;
    }

    function priceFeed(address token) external view returns (address) {
        return feeds[token];
    }

    function isVault(address) external pure returns (bool) {
        return true;
    }

    function executionsHalted() external pure returns (bool) {
        return false;
    }
}
