// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CommonBase} from "forge-std/Base.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {StdUtils} from "forge-std/StdUtils.sol";
import {TideVault} from "../../src/TideVault.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {MockRouter} from "../../src/mocks/MockRouter.sol";
import {MockAggregatorV3} from "../../src/mocks/MockAggregatorV3.sol";

/// @dev Drives a vault through arbitrary but well-formed user and keeper activity.
contract VaultHandler is CommonBase, StdCheats, StdUtils {
    TideVault public vault;
    MockERC20 public quote;
    MockERC20 public target;
    MockRouter public router;
    MockAggregatorV3 public targetFeed;
    MockAggregatorV3 public quoteFeed;
    address public owner;
    address public keeper;

    uint256 public totalDeposited;
    uint256 public totalWithdrawnQuote;
    uint256 public totalFeePaid;
    address public treasury;

    constructor(
        TideVault vault_,
        MockERC20 quote_,
        MockERC20 target_,
        MockRouter router_,
        MockAggregatorV3 targetFeed_,
        MockAggregatorV3 quoteFeed_,
        address owner_,
        address keeper_,
        address treasury_
    ) {
        vault = vault_;
        quote = quote_;
        target = target_;
        router = router_;
        targetFeed = targetFeed_;
        quoteFeed = quoteFeed_;
        owner = owner_;
        keeper = keeper_;
        treasury = treasury_;
    }

    function deposit(uint96 amount) external {
        uint256 a = bound(uint256(amount), 1e6, 100_000e6);
        quote.mint(owner, a);
        vm.startPrank(owner);
        quote.approve(address(vault), a);
        try vault.deposit(a) {
            totalDeposited += a;
        } catch {}
        vm.stopPrank();
    }

    function createPlan(uint96 amount, uint32 interval, uint16 slippage) external {
        uint128 a = uint128(bound(uint256(amount), 1e6, 10_000e6));
        uint64 iv = uint64(bound(uint256(interval), 1 hours, 90 days));
        uint16 s = uint16(bound(uint256(slippage), 0, 1000));
        vm.prank(owner);
        try vault.createPlan(address(target), a, iv, iv, 0, s, 0) {} catch {}
    }

    function warpAndExecute(uint256 planSeed, uint32 jump) external {
        uint256 n = vault.plansLength();
        if (n == 0) return;
        uint256 planId = planSeed % n;

        vm.warp(block.timestamp + bound(uint256(jump), 1 hours, 30 days));
        targetFeed.setAnswer(int256(uint256(182_40000000)));
        quoteFeed.setAnswer(int256(uint256(1_00000000)));

        (bool ready,,) = vault.canExecute(planId);
        if (!ready) return;

        TideVault.Plan memory p = vault.getPlan(planId);
        uint256 amountIn = p.amountPerCycle - (uint256(p.amountPerCycle) * 15) / 10_000;
        uint256 treasuryBefore = quote.balanceOf(treasury);

        vm.prank(keeper);
        try vault.execute(
            planId,
            0,
            address(router),
            address(router),
            abi.encodeCall(MockRouter.swap, (address(quote), address(target), amountIn, address(vault)))
        ) {
            totalFeePaid += quote.balanceOf(treasury) - treasuryBefore;
        } catch {}
    }

    function withdrawQuote(uint96 amount) external {
        uint256 bal = quote.balanceOf(address(vault));
        if (bal == 0) return;
        uint256 a = bound(uint256(amount), 1, bal);
        vm.prank(owner);
        try vault.withdraw(address(quote), a, owner) {
            totalWithdrawnQuote += a;
        } catch {}
    }

    function togglePause(bool on) external {
        vm.prank(owner);
        if (on) {
            try vault.pause() {} catch {}
        } else {
            try vault.unpause() {} catch {}
        }
    }

    function setRouterSlippage(uint16 bps) external {
        router.setSlippageBps(uint16(bound(uint256(bps), 0, 3000)));
    }
}
