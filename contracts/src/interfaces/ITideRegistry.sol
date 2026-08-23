// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title ITideRegistry
/// @notice Protocol-level configuration consumed by every TideVault clone.
interface ITideRegistry {
    function treasury() external view returns (address);
    function feeBps() external view returns (uint16);
    function defaultKeeper() external view returns (address);
    function maxOracleAge() external view returns (uint32);
    function isRouterAllowed(address router) external view returns (bool);
    function priceFeed(address token) external view returns (address);
    function isVault(address vault) external view returns (bool);
    function executionsHalted() external view returns (bool);
}
