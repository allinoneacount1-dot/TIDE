// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TideTestBase} from "./helpers/TideTestBase.sol";
import {VaultHandler} from "./helpers/VaultHandler.sol";
import {TideVault} from "../src/TideVault.sol";

/// @notice Properties that must hold after any sequence of user and keeper activity.
contract TideVaultInvariantsTest is TideTestBase {
    VaultHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new VaultHandler(vault, usdg, aapl, router, aaplFeed, usdgFeed, user, keeper, treasury);
        targetContract(address(handler));
    }

    /// @notice No allowance may outlive the transaction that granted it.
    function invariant_NoStandingAllowance() public view {
        assertEq(usdg.allowance(address(vault), address(router)), 0);
    }

    /// @notice The protocol can never have taken more than its ceiling of what was spent.
    function invariant_FeeNeverExceedsCeiling() public view {
        uint256 spent;
        TideVault.Plan[] memory plans = vault.getPlans();
        for (uint256 i; i < plans.length; ++i) {
            spent += plans[i].totalIn;
        }
        // fee is charged on gross, totalIn records net, so gross = net + fee
        uint256 gross = spent + handler.totalFeePaid();
        assertLe(handler.totalFeePaid() * 10_000, gross * vault.MAX_FEE_BPS() + 10_000);
    }

    /// @notice A plan can never have spent more than its cycles allowed.
    function invariant_SpendBoundedByCycles() public view {
        TideVault.Plan[] memory plans = vault.getPlans();
        for (uint256 i; i < plans.length; ++i) {
            assertLe(uint256(plans[i].totalIn), uint256(plans[i].amountPerCycle) * plans[i].cyclesExecuted);
        }
    }

    /// @notice Acquired assets are always accounted for and never stranded.
    function invariant_AcquiredAssetsAreHeldOrWithdrawn() public view {
        TideVault.Plan[] memory plans = vault.getPlans();
        uint256 acquired;
        for (uint256 i; i < plans.length; ++i) {
            acquired += plans[i].totalOut;
        }
        assertEq(aapl.balanceOf(address(vault)), acquired, "every unit bought is still in the vault");
    }

    /// @notice The owner can always leave, in every reachable state.
    function invariant_OwnerCanAlwaysExit() public {
        uint256 snap = vm.snapshotState();
        vm.prank(user);
        vault.exitAll(user);
        assertEq(vault.idleCapital(), 0, "quote fully returned");
        assertEq(aapl.balanceOf(address(vault)), 0, "equity fully returned");
        vm.revertToState(snap);
    }
}
