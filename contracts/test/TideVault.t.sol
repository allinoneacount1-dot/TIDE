// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TideTestBase} from "./helpers/TideTestBase.sol";
import {TideVault} from "../src/TideVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {PriceMath} from "../src/libraries/PriceMath.sol";

/// @notice The closed loop: deposit, configure, execute, observe, withdraw.
contract TideVaultTest is TideTestBase {
    // ------------------------------ lifecycle ------------------------------ //

    function test_ClosedLoop_DepositExecuteWithdraw() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);

        assertEq(vault.idleCapital(), 1_000 * ONE_USDG, "idle after deposit");

        vm.warp(block.timestamp + 7 days);
        _refreshFeeds();
        _keeperExecute(planId);

        TideVault.Plan memory p = vault.getPlan(planId);
        assertEq(p.cyclesExecuted, 1, "one cycle");
        assertGt(p.totalOut, 0, "acquired something");
        assertEq(aapl.balanceOf(address(vault)), p.totalOut, "vault holds the equity");

        // The whole point: what the vault acquired, the owner can take out.
        uint256 acquired = aapl.balanceOf(address(vault));
        vm.prank(user);
        vault.withdrawAll(address(aapl), user);
        assertEq(aapl.balanceOf(user), acquired, "equity withdrawn in full");
        assertEq(aapl.balanceOf(address(vault)), 0, "nothing stranded");

        uint256 idle = vault.idleCapital();
        vm.prank(user);
        vault.withdrawAll(address(usdg), user);
        assertEq(vault.idleCapital(), 0, "quote withdrawn in full");
        assertGt(idle, 0, "quote remained after one cycle");
    }

    function test_ExitAll_ReturnsEveryAsset() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        vm.warp(block.timestamp + 7 days);
        _refreshFeeds();
        _keeperExecute(planId);

        uint256 quoteBefore = usdg.balanceOf(user);
        uint256 vaultQuote = vault.idleCapital();
        uint256 vaultEquity = aapl.balanceOf(address(vault));

        vm.prank(user);
        vault.exitAll(user);

        assertEq(usdg.balanceOf(user), quoteBefore + vaultQuote, "quote returned");
        assertEq(aapl.balanceOf(user), vaultEquity, "equity returned");
        assertEq(vault.idleCapital(), 0);
        assertEq(aapl.balanceOf(address(vault)), 0);
    }

    function test_Deposit_AnyoneCanFund_OnlyOwnerCanTake() public {
        usdg.mint(stranger, 500 * ONE_USDG);
        vm.startPrank(stranger);
        usdg.approve(address(vault), type(uint256).max);
        vault.deposit(500 * ONE_USDG);
        vm.stopPrank();

        assertEq(vault.idleCapital(), 500 * ONE_USDG, "stranger may fund");

        vm.prank(stranger);
        vm.expectRevert(TideVault.NotOwner.selector);
        vault.withdraw(address(usdg), 1, stranger);
    }

    // ------------------------------- economics ----------------------------- //

    function test_Fee_GoesToTreasury_AndIsExcludedFromSwap() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        vm.warp(block.timestamp + 7 days);
        _refreshFeeds();

        uint256 expectedFee = (100 * ONE_USDG * FEE_BPS) / 10_000;
        uint256 treasuryBefore = usdg.balanceOf(treasury);

        _keeperExecute(planId);

        assertEq(usdg.balanceOf(treasury) - treasuryBefore, expectedFee, "fee to treasury");
        TideVault.Plan memory p = vault.getPlan(planId);
        assertEq(p.totalIn, 100 * ONE_USDG - expectedFee, "swap spends net of fee");
    }

    function test_ExecutionPrice_MatchesRouterPrice_AcrossDecimals() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        vm.warp(block.timestamp + 7 days);
        _refreshFeeds();

        vm.recordLogs();
        _keeperExecute(planId);

        TideVault.Plan memory p = vault.getPlan(planId);
        uint256 realised = PriceMath.impliedPrice(p.totalIn, p.totalOut, QUOTE_DECIMALS, TARGET_DECIMALS);

        // 6-decimal quote into an 18-decimal target must still land on the 1e8 scale.
        assertApproxEqRel(realised, AAPL_PRICE, 1e15, "realised price within 0.1% of $182.40");
    }

    function test_Cadence_HoldsWhenOnTime() public {
        _fund(10_000);
        uint256 planId = _plan(100, 7 days, 0, 100);

        uint64 firstWindow = vault.getPlan(planId).nextExecution;
        vm.warp(firstWindow);
        _refreshFeeds();
        _keeperExecute(planId);
        assertEq(vault.getPlan(planId).nextExecution, firstWindow + 7 days, "cadence preserved");

        // Keeper is half an hour late: the grid must not slip by half an hour.
        vm.warp(firstWindow + 7 days + 30 minutes);
        _refreshFeeds();
        _keeperExecute(planId);
        assertEq(vault.getPlan(planId).nextExecution, firstWindow + 14 days, "late run keeps the grid");
    }

    function test_Cadence_NoBurstCatchupAfterOutage() public {
        _fund(10_000);
        uint256 planId = _plan(100, 7 days, 0, 100);

        vm.warp(block.timestamp + 90 days); // keeper was down for three months
        _refreshFeeds();
        _keeperExecute(planId);

        // The next window is a fresh interval out, not 12 backdated windows.
        assertEq(vault.getPlan(planId).nextExecution, uint64(block.timestamp) + 7 days, "no catch-up burst");

        (bool ready, TideVault.Readiness reason,) = vault.canExecute(planId);
        assertFalse(ready);
        assertEq(uint8(reason), uint8(TideVault.Readiness.NotDue));
    }

    function test_CyclesTotal_RetiresPlan() public {
        _fund(10_000);
        vm.prank(user);
        uint256 planId = vault.createPlan(address(aapl), uint128(100 * ONE_USDG), 7 days, 0, 0, 100, 2);

        for (uint256 i; i < 2; ++i) {
            _advanceToWindow(planId);
            _keeperExecute(planId);
        }

        TideVault.Plan memory p = vault.getPlan(planId);
        assertEq(p.cyclesExecuted, 2);
        assertFalse(p.active, "retired after final cycle");

        (, TideVault.Readiness reason,) = vault.canExecute(planId);
        assertEq(uint8(reason), uint8(TideVault.Readiness.PlanInactive));
    }

    // ------------------------------- readiness ----------------------------- //

    function test_Readiness_ReportsEveryBlockingReason() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);

        (, TideVault.Readiness r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.NotDue), "not due yet");

        vm.warp(block.timestamp + 7 days);
        _refreshFeeds();
        (bool ready,,) = vault.canExecute(planId);
        assertTrue(ready, "ready in the window");

        vm.prank(user);
        vault.pause();
        (, r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.VaultPaused));
        vm.prank(user);
        vault.unpause();

        vm.prank(protocolOwner);
        registry.setExecutionsHalted(true);
        (, r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.ProtocolHalted));
        vm.prank(protocolOwner);
        registry.setExecutionsHalted(false);

        vm.prank(user);
        vault.setPlanActive(planId, false);
        (, r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.PlanInactive));
        vm.prank(user);
        vault.setPlanActive(planId, true);

        // Drain the vault so the same plan is now underfunded.
        vm.warp(block.timestamp + 7 days);
        vm.prank(user);
        vault.withdrawAll(address(usdg), user);
        _refreshFeeds();
        (, r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.InsufficientCapital));
    }

    function test_Readiness_OracleStale_BlocksExecution() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        vm.warp(block.timestamp + 7 days);

        // Feed last updated well beyond the registry's freshness window.
        aaplFeed.setAnswerStale(int256(AAPL_PRICE), block.timestamp - 48 hours);
        usdgFeed.setAnswer(1_00000000);

        (, TideVault.Readiness r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.OracleStale), "stale equity feed halts execution");

        vm.expectRevert(abi.encodeWithSelector(TideVault.NotReady.selector, TideVault.Readiness.OracleStale));
        vm.prank(keeper);
        vault.execute(planId, 0, address(router), address(router), _swapData(1));
    }

    function test_Readiness_Unguarded_WhenNoFeedAndNoLimit() public {
        MockERC20 unlisted = new MockERC20("Nothing - Robinhood Token", "NADA", 18);
        _fund(1_000);

        vm.prank(user);
        uint256 planId = vault.createPlan(address(unlisted), uint128(100 * ONE_USDG), 7 days, 0, 0, 100, 0);
        vm.warp(block.timestamp + 7 days);

        (, TideVault.Readiness r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.Unguarded), "no oracle and no limit price is never executable");
    }

    // -------------------------------- plans -------------------------------- //

    function test_UpdatePlan_ShorteningIntervalCannotOpenAnImmediateWindow() public {
        _fund(10_000);
        uint256 planId = _plan(100, 30 days, 0, 100);

        vm.prank(user);
        vault.updatePlan(planId, uint128(100 * ONE_USDG), 1 hours, 0, 100, 0);

        (, TideVault.Readiness r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.NotDue), "re-cadenced forward, not retroactively due");
        assertEq(vault.getPlan(planId).nextExecution, uint64(block.timestamp) + 1 hours);
    }

    function test_CreatePlan_RejectsBadParameters() public {
        vm.startPrank(user);

        vm.expectRevert(TideVault.TargetIsQuote.selector);
        vault.createPlan(address(usdg), uint128(ONE_USDG), 7 days, 0, 0, 100, 0);

        vm.expectRevert(abi.encodeWithSelector(TideVault.InvalidInterval.selector, uint64(1 minutes)));
        vault.createPlan(address(aapl), uint128(ONE_USDG), 1 minutes, 0, 0, 100, 0);

        vm.expectRevert(abi.encodeWithSelector(TideVault.InvalidSlippage.selector, uint16(2000)));
        vault.createPlan(address(aapl), uint128(ONE_USDG), 7 days, 0, 0, 2000, 0);

        vm.expectRevert(TideVault.ZeroAmount.selector);
        vault.createPlan(address(aapl), 0, 7 days, 0, 0, 100, 0);

        vm.stopPrank();
    }

    function test_StartDelayZero_IsImmediatelyDue() public {
        _fund(1_000);
        vm.prank(user);
        uint256 planId = vault.createPlan(address(aapl), uint128(100 * ONE_USDG), 7 days, 0, 0, 100, 0);

        (bool ready,,) = vault.canExecute(planId);
        assertTrue(ready, "startDelay 0 opens the window immediately");
    }

    function test_Exposure_DeduplicatesTargets() public {
        _fund(10_000);
        _plan(100, 7 days, 0, 100);
        _plan(200, 30 days, 0, 100);

        (address[] memory tokens, uint256[] memory balances) = vault.exposure();
        assertEq(tokens.length, 1, "same target counted once");
        assertEq(tokens[0], address(aapl));
        assertEq(balances[0], 0);
    }

    // ------------------------------ ownership ------------------------------ //

    function test_Ownership_IsTwoStep() public {
        vm.prank(user);
        vault.transferOwnership(stranger);
        assertEq(vault.owner(), user, "not transferred until accepted");

        vm.prank(stranger);
        vault.acceptOwnership();
        assertEq(vault.owner(), stranger);
        assertEq(vault.pendingOwner(), address(0));
    }

    function test_Implementation_CannotBeInitialized() public {
        TideVault impl = TideVault(registry.implementation());
        vm.expectRevert();
        impl.initialize(stranger, address(usdg), address(registry));
    }
}
