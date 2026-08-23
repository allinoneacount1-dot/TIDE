// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TideTestBase} from "./helpers/TideTestBase.sol";
import {TideVault} from "../src/TideVault.sol";
import {TideRegistry} from "../src/TideRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";
import {HostileRouter} from "../src/mocks/HostileRouter.sol";
import {LyingRegistry} from "../src/mocks/LyingRegistry.sol";

/// @notice Every one of these is an attack the previous TideVault permitted.
contract TideVaultSecurityTest is TideTestBase {
    // ------------------------- the compromised keeper ----------------------- //

    /// @dev The old contract took `minOut` from the caller and used it verbatim, so
    ///      the keeper could set it to zero and accept any fill. Here the on-chain
    ///      floor is derived from the oracle and the owner's limit, and `minOut` can
    ///      only tighten it.
    function test_Keeper_CannotWeakenSlippageFloor() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        // Router is quoting 40% below the oracle — a sandwich, or a poisoned route.
        router.setSlippageBps(4_000);

        uint256 amountIn = _afterFee(100 * ONE_USDG);
        bytes memory data = _swapData(amountIn);

        vm.prank(keeper);
        vm.expectPartialRevert(TideVault.SlippageExceeded.selector);
        vault.execute(planId, 0, address(router), address(router), data); // minOut = 0
    }

    function test_Keeper_CannotExecuteAboveOwnerLimitPrice() public {
        // No oracle for this asset: the owner's limit price is the only guard, and it
        // must be sufficient on its own.
        MockERC20 unlisted = new MockERC20("Tesla - Robinhood Token", "TSLA", 18);
        MockRouter r2 = new MockRouter(QUOTE_DECIMALS, TARGET_DECIMALS, 400_00000000);
        vm.prank(protocolOwner);
        registry.setRouter(address(r2), true);

        _fund(1_000);
        vm.prank(user);
        // Owner will pay at most $350 per share; the market is at $400.
        uint256 planId = vault.createPlan(address(unlisted), uint128(100 * ONE_USDG), 7 days, 0, 350_00000000, 100, 0);
        _advanceToWindow(planId);

        uint256 amountIn = _afterFee(100 * ONE_USDG);
        bytes memory data =
            abi.encodeCall(MockRouter.swap, (address(usdg), address(unlisted), amountIn, address(vault)));

        vm.prank(keeper);
        vm.expectPartialRevert(TideVault.SlippageExceeded.selector);
        vault.execute(planId, 0, address(r2), address(r2), data);

        // Price falls to $340 — now inside the owner's limit, so it clears.
        r2.setPrice(340_00000000);
        vm.prank(keeper);
        vault.execute(planId, 0, address(r2), address(r2), data);
        assertGt(unlisted.balanceOf(address(vault)), 0, "executes once inside the limit");
    }

    function test_Keeper_CannotUseUnapprovedRouter() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        MockRouter rogue = new MockRouter(QUOTE_DECIMALS, TARGET_DECIMALS, AAPL_PRICE);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(TideVault.RouterNotAllowed.selector, address(rogue)));
        vault.execute(planId, 0, address(rogue), address(rogue), _swapData(1));
    }

    function test_Keeper_CannotApproveUnallowlistedSpender() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        address rogueSpender = makeAddr("rogueSpender");
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(TideVault.SpenderNotAllowed.selector, rogueSpender));
        vault.execute(planId, 0, address(router), rogueSpender, _swapData(1));
    }

    function test_Keeper_HasNoAuthorityOverFunds() public {
        _fund(1_000);
        _plan(100, 7 days, 0, 100);

        vm.startPrank(keeper);
        vm.expectRevert(TideVault.NotOwner.selector);
        vault.withdraw(address(usdg), 1, keeper);
        vm.expectRevert(TideVault.NotOwner.selector);
        vault.exitAll(keeper);
        vm.expectRevert(TideVault.NotOwner.selector);
        vault.createPlan(address(aapl), 1, 7 days, 0, 0, 100, 0);
        vm.expectRevert(TideVault.NotOwner.selector);
        vault.updatePlan(0, 1, 7 days, 0, 100, 0);
        vm.expectRevert(TideVault.NotOwner.selector);
        vault.setKeeper(keeper);
        vm.expectRevert(TideVault.NotOwner.selector);
        vault.transferOwnership(keeper);
        vm.stopPrank();
    }

    // --------------------------- the hostile router ------------------------- //

    function test_Router_TakingCapitalAndReturningNothing_Reverts() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        HostileRouter thief = new HostileRouter(HostileRouter.Mode.StealAndGiveNothing, address(vault), address(usdg));
        vm.prank(protocolOwner);
        registry.setRouter(address(thief), true);

        uint256 amountIn = _afterFee(100 * ONE_USDG);
        vm.prank(keeper);
        vm.expectPartialRevert(TideVault.SlippageExceeded.selector);
        vault.execute(planId, 0, address(thief), address(thief), abi.encodeCall(HostileRouter.attack, (amountIn)));

        // The revert unwinds the transfer: nothing left the vault.
        assertEq(vault.idleCapital(), 1_000 * ONE_USDG, "capital intact after a hostile route");
    }

    function test_Router_CannotPullMoreThanTheCycleAmount() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        // The router tries to drain the whole allowance it was granted. The allowance
        // is scoped to exactly one cycle, so "everything" is one cycle.
        router.setOverspend(true);
        uint256 amountIn = _afterFee(100 * ONE_USDG);

        vm.prank(keeper);
        vault.execute(planId, 0, address(router), address(router), _swapData(amountIn));

        TideVault.Plan memory p = vault.getPlan(planId);
        assertLe(p.totalIn, amountIn, "cannot spend past the cycle allowance");
        assertEq(usdg.allowance(address(vault), address(router)), 0, "allowance revoked after the call");
    }

    function test_Router_CannotReenter() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        HostileRouter reentrant = new HostileRouter(HostileRouter.Mode.Reenter, address(vault), address(usdg));
        vm.prank(protocolOwner);
        registry.setRouter(address(reentrant), true);

        vm.prank(keeper);
        vm.expectPartialRevert(TideVault.SwapFailed.selector);
        vault.execute(planId, 0, address(reentrant), address(reentrant), abi.encodeCall(HostileRouter.attack, (1)));
    }

    function test_Allowance_IsZeroAfterEverySuccessfulExecution() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);
        _keeperExecute(planId);
        assertEq(usdg.allowance(address(vault), address(router)), 0, "no standing allowance survives");
    }

    // ------------------------ the compromised registry ---------------------- //

    function test_Vault_ClampsFee_EvenIfRegistryReports100Percent() public {
        LyingRegistry liar = new LyingRegistry(treasury, address(router), keeper);
        liar.setFeed(address(aapl), address(aaplFeed));
        liar.setFeed(address(usdg), address(usdgFeed));

        // Deploy a vault bound to the hostile registry.
        TideVault rogueVault = TideVault(payable(_cloneVault(address(liar))));

        usdg.mint(user, 1_000 * ONE_USDG);
        vm.startPrank(user);
        usdg.approve(address(rogueVault), type(uint256).max);
        rogueVault.deposit(1_000 * ONE_USDG);
        uint256 planId = rogueVault.createPlan(address(aapl), uint128(100 * ONE_USDG), 7 days, 0, 0, 100, 0);
        vm.stopPrank();

        vm.warp(rogueVault.getPlan(planId).nextExecution);
        _refreshFeeds();

        uint256 treasuryBefore = usdg.balanceOf(treasury);
        uint256 amountIn = 100 * ONE_USDG - (100 * ONE_USDG * 50) / 10_000; // clamped to MAX_FEE_BPS
        bytes memory data =
            abi.encodeCall(MockRouter.swap, (address(usdg), address(aapl), amountIn, address(rogueVault)));

        vm.prank(keeper);
        rogueVault.execute(planId, 0, address(router), address(router), data);

        uint256 charged = usdg.balanceOf(treasury) - treasuryBefore;
        assertEq(charged, (100 * ONE_USDG * 50) / 10_000, "fee clamped to the compiled-in 0.50% ceiling");
    }

    function test_Registry_CannotSetFeeAboveCeiling() public {
        vm.prank(protocolOwner);
        vm.expectRevert(abi.encodeWithSelector(TideRegistry.FeeTooHigh.selector, uint16(51), uint16(50)));
        registry.setFeeBps(51);
    }

    function test_ProtocolHalt_StopsExecutionButNeverTheExit() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        vm.prank(protocolOwner);
        registry.setExecutionsHalted(true);

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(TideVault.NotReady.selector, TideVault.Readiness.ProtocolHalted));
        vault.execute(planId, 0, address(router), address(router), _swapData(1));

        // The owner still gets out.
        vm.prank(user);
        vault.exitAll(user);
        assertEq(vault.idleCapital(), 0, "exit is never gated");
    }

    function test_Paused_StopsDepositsAndExecutionButNeverTheExit() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        vm.prank(user);
        vault.pause();

        vm.prank(user);
        vm.expectRevert();
        vault.deposit(1 * ONE_USDG);

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(TideVault.NotReady.selector, TideVault.Readiness.VaultPaused));
        vault.execute(planId, 0, address(router), address(router), _swapData(1));

        vm.prank(user);
        vault.withdraw(address(usdg), 100 * ONE_USDG, user);
        assertEq(vault.idleCapital(), 900 * ONE_USDG, "withdraw works while paused");
    }

    // ------------------------------ the oracle ------------------------------ //

    function test_Oracle_NegativeOrZeroAnswer_IsTreatedAsStale() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        aaplFeed.setAnswer(0);
        (, TideVault.Readiness r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.OracleStale), "zero answer is not a price");

        aaplFeed.setAnswer(-1);
        (, r,) = vault.canExecute(planId);
        assertEq(uint8(r), uint8(TideVault.Readiness.OracleStale), "negative answer is not a price");
    }

    function test_Oracle_RevertingFeed_DoesNotBrickTheVault() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        aaplFeed.setShouldRevert(true);

        // Reads still answer, so the UI can explain the state instead of erroring out.
        (bool ready, TideVault.Readiness r,) = vault.canExecute(planId);
        assertFalse(ready);
        assertEq(uint8(r), uint8(TideVault.Readiness.OracleStale));

        // And the owner can still leave.
        vm.prank(user);
        vault.exitAll(user);
        assertEq(vault.idleCapital(), 0);
    }

    function test_Oracle_QuoteDepeg_TightensTheFloor() public {
        _fund(1_000);
        uint256 planId = _plan(100, 7 days, 0, 100);
        _advanceToWindow(planId);

        uint256 floorAtPar = vault.requiredOutFor(planId);

        // USDG trades at $0.90: the same spend should demand ~10% fewer shares.
        usdgFeed.setAnswer(90_000000);
        uint256 floorDepegged = vault.requiredOutFor(planId);

        assertLt(floorDepegged, floorAtPar, "a weaker quote asset buys less, and the guard knows it");
        assertApproxEqRel(floorDepegged, (floorAtPar * 90) / 100, 1e15);
    }

    // ------------------------------- helpers -------------------------------- //

    function _cloneVault(address registry_) internal returns (address v) {
        TideVault impl = new TideVault();
        bytes20 target = bytes20(address(impl));
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), target)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            v := create(0, clone, 0x37)
        }
        TideVault(v).initialize(user, address(usdg), registry_);
    }
}
