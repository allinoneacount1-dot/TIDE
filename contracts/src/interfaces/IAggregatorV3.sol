// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IAggregatorV3
/// @notice Minimal Chainlink Data Feed interface.
/// @dev Robinhood Chain uses Chainlink as its official oracle. Feeds for tokenized
///      equities are `us_equities_24/5` with an 86400s heartbeat, so `updatedAt`
///      being hours old outside market hours is expected, not a fault.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
