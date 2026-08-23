// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title PriceMath
/// @notice Conversions between token amounts and prices on a fixed 1e8 scale.
/// @dev A "price" throughout TIDE means: whole units of the quote asset required to
///      buy one whole unit of the target asset, scaled by 1e8. This matches the
///      Chainlink Data Feed convention on Robinhood Chain so on-chain guards,
///      the keeper and the UI all speak one unit and never need ad-hoc rescaling.
library PriceMath {
    uint256 internal constant PRICE_SCALE = 1e8;

    error ZeroDenominator();
    error DecimalsOutOfRange();

    /// @notice Price implied by an executed trade.
    /// @param amountIn  Quote spent, in quote base units.
    /// @param amountOut Target received, in target base units.
    /// @return Price on the 1e8 scale.
    function impliedPrice(uint256 amountIn, uint256 amountOut, uint8 quoteDecimals, uint8 targetDecimals)
        internal
        pure
        returns (uint256)
    {
        if (amountOut == 0) revert ZeroDenominator();
        return _convert(amountIn, quoteDecimals, targetDecimals) / amountOut;
    }

    /// @notice Target amount implied by spending `amountIn` at exactly `price`.
    /// @param price Price on the 1e8 scale.
    /// @return Target amount, in target base units.
    function impliedOut(uint256 amountIn, uint256 price, uint8 quoteDecimals, uint8 targetDecimals)
        internal
        pure
        returns (uint256)
    {
        if (price == 0) revert ZeroDenominator();
        return _convert(amountIn, quoteDecimals, targetDecimals) / price;
    }

    /// @dev amountIn * 10**targetDecimals * PRICE_SCALE / 10**quoteDecimals
    function _convert(uint256 amountIn, uint8 quoteDecimals, uint8 targetDecimals) private pure returns (uint256) {
        if (quoteDecimals > 36 || targetDecimals > 36) revert DecimalsOutOfRange();
        return (amountIn * (10 ** uint256(targetDecimals)) * PRICE_SCALE) / (10 ** uint256(quoteDecimals));
    }

    /// @notice Rescale a feed answer to the canonical 1e8 price scale.
    function normalize(uint256 answer, uint8 feedDecimals) internal pure returns (uint256) {
        if (feedDecimals == 8) return answer;
        if (feedDecimals > 36) revert DecimalsOutOfRange();
        if (feedDecimals < 8) return answer * (10 ** uint256(8 - feedDecimals));
        return answer / (10 ** uint256(feedDecimals - 8));
    }
}
