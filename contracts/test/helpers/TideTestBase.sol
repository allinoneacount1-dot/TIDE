// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {TideRegistry} from "../../src/TideRegistry.sol";
import {TideVault} from "../../src/TideVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {MockRouter} from "../../src/mocks/MockRouter.sol";
import {MockAggregatorV3} from "../../src/mocks/MockAggregatorV3.sol";

/// @dev Shared fixture. Decimals mirror Robinhood Chain exactly: USDG is 6, the
///      tokenized equities are 18, Chainlink answers are 8.
abstract contract TideTestBase is Test {
    uint8 internal constant QUOTE_DECIMALS = 6;
    uint8 internal constant TARGET_DECIMALS = 18;
    uint8 internal constant FEED_DECIMALS = 8;

    /// @dev $182.40 on the 1e8 price scale.
    uint256 internal constant AAPL_PRICE = 182_40000000;
    uint256 internal constant ONE_USDG = 10 ** QUOTE_DECIMALS;

    TideRegistry internal registry;
    TideVault internal vault;
    MockERC20 internal usdg;
    MockERC20 internal aapl;
    MockRouter internal router;
    MockAggregatorV3 internal aaplFeed;
    MockAggregatorV3 internal usdgFeed;

    address internal protocolOwner = makeAddr("protocolOwner");
    address internal treasury = makeAddr("treasury");
    address internal keeper = makeAddr("keeper");
    address internal user = makeAddr("user");
    address internal stranger = makeAddr("stranger");

    uint16 internal constant FEE_BPS = 15; // 0.15%

    function setUp() public virtual {
        vm.warp(1_760_000_000);

        usdg = new MockERC20("Global Dollar", "USDG", QUOTE_DECIMALS);
        aapl = new MockERC20("Apple - Robinhood Token", "AAPL", TARGET_DECIMALS);

        router = new MockRouter(QUOTE_DECIMALS, TARGET_DECIMALS, AAPL_PRICE);
        aaplFeed = new MockAggregatorV3(FEED_DECIMALS, int256(AAPL_PRICE), "Robinhood AAPL / USD");
        usdgFeed = new MockAggregatorV3(FEED_DECIMALS, 1_00000000, "USDG / USD");

        vm.prank(protocolOwner);
        registry = new TideRegistry(protocolOwner, treasury, FEE_BPS, keeper);

        vm.startPrank(protocolOwner);
        registry.setRouter(address(router), true);
        registry.setPriceFeed(address(aapl), address(aaplFeed));
        registry.setPriceFeed(address(usdg), address(usdgFeed));
        vm.stopPrank();

        vm.prank(user);
        vault = TideVault(registry.createVault(address(usdg)));

        usdg.mint(user, 1_000_000 * ONE_USDG);
        vm.prank(user);
        usdg.approve(address(vault), type(uint256).max);
    }

    // ----------------------------- convenience ----------------------------- //

    function _fund(uint256 whole) internal {
        vm.prank(user);
        vault.deposit(whole * ONE_USDG);
    }

    function _plan(uint256 amountWhole, uint64 interval, uint128 limitPrice, uint16 slippageBps)
        internal
        returns (uint256 planId)
    {
        vm.prank(user);
        planId = vault.createPlan(
            address(aapl), uint128(amountWhole * ONE_USDG), interval, interval, limitPrice, slippageBps, 0
        );
    }

    /// @dev Calldata that makes the mock router behave like a real one: it pulls the
    ///      quote through the allowance and sends the target back to the vault.
    function _swapData(uint256 amountIn) internal view returns (bytes memory) {
        return abi.encodeCall(MockRouter.swap, (address(usdg), address(aapl), amountIn, address(vault)));
    }

    function _afterFee(uint256 amount) internal pure returns (uint256) {
        return amount - (amount * FEE_BPS) / 10_000;
    }

    /// @dev Execute a due plan the way the keeper would.
    function _keeperExecute(uint256 planId) internal {
        TideVault.Plan memory p = vault.getPlan(planId);
        uint256 amountIn = _afterFee(p.amountPerCycle);
        uint256 minOut = router.quoteOut(amountIn);
        bytes memory data = _swapData(amountIn);
        vm.prank(keeper);
        vault.execute(planId, minOut, address(router), address(router), data);
    }

    /// @dev Advance to a plan's next open window and refresh the oracles, the way a
    ///      real keeper would find the chain. Absolute rather than relative so the
    ///      test never drifts out of the oracle freshness window by accident.
    function _advanceToWindow(uint256 planId) internal {
        uint64 window = vault.getPlan(planId).nextExecution;
        if (window > block.timestamp) vm.warp(window);
        _refreshFeeds();
    }

    function _refreshFeeds() internal {
        aaplFeed.setAnswer(int256(AAPL_PRICE));
        usdgFeed.setAnswer(1_00000000);
    }
}
