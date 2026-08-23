// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PriceMath} from "../src/libraries/PriceMath.sol";

/// @dev PriceMath is an internal library, so it inlines into its caller. An external
///      harness gives `vm.expectRevert` a real call frame to observe.
contract PriceMathHarness {
    function impliedOut(uint256 a, uint256 p, uint8 qd, uint8 td) external pure returns (uint256) {
        return PriceMath.impliedOut(a, p, qd, td);
    }

    function impliedPrice(uint256 a, uint256 o, uint8 qd, uint8 td) external pure returns (uint256) {
        return PriceMath.impliedPrice(a, o, qd, td);
    }
}

contract PriceMathTest is Test {
    PriceMathHarness internal h = new PriceMathHarness();

    /// @dev $100 of a 6-decimal quote at $182.40 buys ~0.548 of an 18-decimal target.
    function test_KnownCase_RobinhoodDecimals() public pure {
        uint256 out = PriceMath.impliedOut(100e6, 182_40000000, 6, 18);
        assertApproxEqRel(out, 0.548245614e18, 1e12);

        uint256 price = PriceMath.impliedPrice(100e6, out, 6, 18);
        assertApproxEqRel(price, 182_40000000, 1e12);
    }

    function test_Normalize_HandlesFeedDecimals() public pure {
        assertEq(PriceMath.normalize(182_40000000, 8), 182_40000000);
        assertEq(PriceMath.normalize(18240, 2), 182_40000000);
        assertEq(PriceMath.normalize(182_400000000000000000, 18), 182_40000000);
    }

    /// @notice impliedOut and impliedPrice must be inverses within rounding.
    function testFuzz_RoundTrip(uint96 amountIn, uint64 price) public pure {
        uint256 a = bound(uint256(amountIn), 1e6, 1e15);
        uint256 p = bound(uint256(price), 1e6, 1e14);

        uint256 out = PriceMath.impliedOut(a, p, 6, 18);
        vm.assume(out > 0);
        uint256 back = PriceMath.impliedPrice(a, out, 6, 18);

        assertApproxEqRel(back, p, 1e12, "round trip within 0.0001%");
    }

    /// @notice A higher price must never imply more output for the same spend.
    function testFuzz_Monotonic(uint96 amountIn, uint64 priceA, uint64 priceB) public pure {
        uint256 a = bound(uint256(amountIn), 1e6, 1e15);
        uint256 pa = bound(uint256(priceA), 1e6, 1e14);
        uint256 pb = bound(uint256(priceB), 1e6, 1e14);
        vm.assume(pa < pb);

        assertGe(PriceMath.impliedOut(a, pa, 6, 18), PriceMath.impliedOut(a, pb, 6, 18));
    }

    function testFuzz_SymmetricDecimals(uint96 amountIn, uint8 qd, uint8 td) public pure {
        uint256 a = bound(uint256(amountIn), 1e6, 1e15);
        uint8 q = uint8(bound(uint256(qd), 2, 18));
        uint8 t = uint8(bound(uint256(td), 2, 18));

        uint256 out = PriceMath.impliedOut(a, 1e8, q, t);

        // At price 1.00000000 the whole-unit amounts must match, allowing for the
        // single unit of truncation that integer division can shave off. Asserting
        // the exact truncation bound is stronger than a percentage tolerance,
        // which would silently accept a real precision regression at small scale.
        uint256 lhs = out * (10 ** uint256(q));
        uint256 rhs = a * (10 ** uint256(t));
        assertLe(lhs, rhs, "conversion never invents value");
        assertGe(lhs + (10 ** uint256(q)), rhs, "loses at most one unit to truncation");
    }

    function test_ZeroDenominator_Reverts() public {
        vm.expectRevert(PriceMath.ZeroDenominator.selector);
        h.impliedOut(1e6, 0, 6, 18);
        vm.expectRevert(PriceMath.ZeroDenominator.selector);
        h.impliedPrice(1e6, 0, 6, 18);
    }

    function test_DecimalsOutOfRange_Reverts() public {
        vm.expectRevert(PriceMath.DecimalsOutOfRange.selector);
        h.impliedOut(1e6, 1e8, 37, 18);
    }
}
