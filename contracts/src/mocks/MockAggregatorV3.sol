// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";

/// @notice Chainlink-shaped price feed for tests and the local devnet.
contract MockAggregatorV3 is IAggregatorV3 {
    uint8 public immutable decimals;
    string public description;

    int256 private _answer;
    uint256 private _updatedAt;
    uint80 private _roundId;
    bool private _shouldRevert;

    constructor(uint8 decimals_, int256 initialAnswer, string memory description_) {
        decimals = decimals_;
        description = description_;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    function setAnswer(int256 answer) external {
        _answer = answer;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    /// @dev Set the answer without refreshing `updatedAt`, to simulate a stale feed.
    function setAnswerStale(int256 answer, uint256 updatedAt) external {
        _answer = answer;
        _updatedAt = updatedAt;
        _roundId++;
    }

    function setShouldRevert(bool v) external {
        _shouldRevert = v;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        require(!_shouldRevert, "FEED_DOWN");
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }
}
