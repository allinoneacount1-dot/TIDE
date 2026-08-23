// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TideVault} from "../src/TideVault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {MockUSDC, MockTarget, MockAggregator} from "../src/Mocks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TideTest is Test {
    MockUSDC usdc;
    MockTarget target;
    MockAggregator aggregator;
    TideVault vault;
    VaultFactory factory;
    address user = address(0xBEEF);
    address keeper = address(0x1234567890123456789012345678901234567890);
    address treasury = address(0xfEEDFEEDfeEDFEedFEEdFEEDFeEdfEEdFeEdFEEd);

    function setUp() public {
        usdc = new MockUSDC();
        target = new MockTarget();
        aggregator = new MockAggregator(address(target));

        // deploy implementation for factory
        TideVault impl = new TideVault(IERC20(address(usdc)), IERC20(address(target)), 7 days, address(this), keeper, treasury, address(aggregator));
        factory = new VaultFactory(address(impl), treasury);

        // create vault via factory
        vm.prank(user);
        address v = factory.createVault(IERC20(address(usdc)), IERC20(address(target)), 7 days, keeper, address(aggregator));
        vault = TideVault(v);

        // fund user
        usdc.mint(user, 10000e6);
        vm.prank(user);
        usdc.approve(address(vault), type(uint256).max);
    }

    function testDeposit() public {
        vm.prank(user);
        vault.deposit(1000e6, user);
        assertEq(vault.balanceOf(user), 1000e6);
        assertEq(vault.totalAssets(), 1000e6);
    }

    function testCanExecute() public {
        vm.prank(user);
        vault.deposit(1000e6, user);
        assertFalse(vault.canExecute());
        vm.warp(block.timestamp + 7 days + 1);
        assertTrue(vault.canExecute());
    }

    function testExecute() public {
        vm.prank(user);
        vault.deposit(1000e6, user);
        vm.warp(block.timestamp + 7 days + 1);

        uint256 amount = 100e6;
        uint256 minOut = 90e18;
        // swapData = mockSwap( amountAfterFee ) — vault will call aggregator with this
        // fee = 0.15% => 0.15e6, amountAfterFee = 99.85e6
        uint256 fee = (amount * 15) / 10000;
        uint256 afterFee = amount - fee;
        bytes memory swapData = abi.encodeWithSelector(MockAggregator.mockSwap.selector, afterFee);

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(keeper);
        vault.execute(amount, minOut, swapData);

        assertEq(usdc.balanceOf(treasury), treasuryBefore + fee);
        assertGt(target.balanceOf(address(vault)), 0);
        assertEq(vault.nextExecution(), block.timestamp + 7 days);
    }

    function testExecuteRevertsIfNotReady() public {
        vm.prank(user);
        vault.deposit(500e6, user);
        vm.prank(keeper);
        vm.expectRevert(TideVault.NotReady.selector);
        vault.execute(100e6, 1, abi.encodeWithSelector(MockAggregator.mockSwap.selector, 100e6));
    }

    function testSlippageReverts() public {
        vm.prank(user);
        vault.deposit(1000e6, user);
        vm.warp(block.timestamp + 7 days + 1);
        bytes memory swapData = abi.encodeWithSelector(MockAggregator.mockSwap.selector, 99e6);
        vm.prank(keeper);
        vm.expectRevert(TideVault.SlippageExceeded.selector);
        vault.execute(100e6, 200e18, swapData); // minOut too high
    }

    function testFactoryCreates() public {
        vm.prank(user);
        address v2 = factory.createVault(IERC20(address(usdc)), IERC20(address(target)), 1 days, keeper, address(aggregator));
        assertTrue(factory.isTideVault(v2));
        assertEq(factory.vaultCount(), 2);
    }

    function testFuzzDeposit(uint96 amount) public {
        amount = uint96(bound(uint256(amount), 1e6, 5000e6));
        usdc.mint(user, amount);
        vm.prank(user);
        vault.deposit(amount, user);
        assertEq(vault.totalAssets() >= amount, true);
    }
}
