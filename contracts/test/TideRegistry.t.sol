// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TideTestBase} from "./helpers/TideTestBase.sol";
import {TideRegistry} from "../src/TideRegistry.sol";
import {TideVault} from "../src/TideVault.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TideRegistryTest is TideTestBase {
    function test_CreateVault_IsDeterministicAndOwnedByCaller() public {
        address predicted = registry.predictVaultAddress(stranger, 0);
        vm.prank(stranger);
        address v = registry.createVault(address(usdg));

        assertEq(v, predicted, "address predicted before deployment");
        assertEq(TideVault(v).owner(), stranger);
        assertEq(TideVault(v).quote(), address(usdg));
        assertEq(TideVault(v).quoteDecimals(), QUOTE_DECIMALS);
        assertEq(TideVault(v).keeper(), keeper, "inherits the protocol keeper");
        assertTrue(registry.isVault(v));
    }

    function test_CreateVault_SupportsMultiplePerUser() public {
        vm.startPrank(stranger);
        address a = registry.createVault(address(usdg));
        address b = registry.createVault(address(usdg));
        vm.stopPrank();

        assertTrue(a != b);
        assertEq(registry.userVaultCount(stranger), 2);
        address[] memory vaults = registry.getUserVaults(stranger);
        assertEq(vaults[0], a);
        assertEq(vaults[1], b);
    }

    function test_Clone_IsFarCheaperThanFullDeployment() public {
        uint256 gasBefore = gasleft();
        vm.prank(stranger);
        registry.createVault(address(usdg));
        uint256 cloneGas = gasBefore - gasleft();

        gasBefore = gasleft();
        new TideVault();
        uint256 fullGas = gasBefore - gasleft();

        assertLt(cloneGas, fullGas / 4, "EIP-1167 clone costs a fraction of a full deployment");
    }

    function test_OnlyOwner_MayChangeProtocolConfiguration() public {
        vm.startPrank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.setRouter(address(router), false);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.setPriceFeed(address(aapl), address(0));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.setFeeBps(0);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        registry.setExecutionsHalted(true);
        vm.stopPrank();
    }

    function test_Ownership_IsTwoStep() public {
        vm.prank(protocolOwner);
        registry.transferOwnership(stranger);
        assertEq(registry.owner(), protocolOwner, "not handed over until accepted");

        vm.prank(stranger);
        registry.acceptOwnership();
        assertEq(registry.owner(), stranger);
    }

    function test_OracleAge_IsBounded() public {
        vm.startPrank(protocolOwner);
        vm.expectRevert(abi.encodeWithSelector(TideRegistry.OracleAgeOutOfRange.selector, uint32(59 minutes)));
        registry.setMaxOracleAge(59 minutes);
        vm.expectRevert(abi.encodeWithSelector(TideRegistry.OracleAgeOutOfRange.selector, uint32(8 days)));
        registry.setMaxOracleAge(8 days);
        registry.setMaxOracleAge(26 hours);
        vm.stopPrank();
        assertEq(registry.maxOracleAge(), 26 hours);
    }

    function test_VaultsSlice_EnumeratesForTheKeeper() public {
        // The keeper discovers work by paging this list rather than scanning
        // logs — Robinhood Chain produces ~864,000 blocks a day.
        vm.startPrank(stranger);
        address a = registry.createVault(address(usdg));
        address b = registry.createVault(address(usdg));
        vm.stopPrank();

        // `vault` from setUp is the first entry.
        assertEq(registry.vaultCount(), 3);

        address[] memory first = registry.vaultsSlice(0, 2);
        assertEq(first.length, 2);
        assertEq(first[0], address(vault));
        assertEq(first[1], a);

        address[] memory rest = registry.vaultsSlice(2, 50);
        assertEq(rest.length, 1, "count is clamped to the end of the list");
        assertEq(rest[0], b);

        assertEq(registry.vaultsSlice(99, 10).length, 0, "start past the end returns empty");
        assertEq(registry.vaultsSlice(0, 0).length, 0);
    }

    function testFuzz_VaultsSlice_NeverRevertsOrOverruns(uint256 start, uint256 count) public view {
        address[] memory page = registry.vaultsSlice(start, count);
        assertLe(page.length, registry.vaultCount());
    }

    function test_SetRouters_BatchesAllowlistChanges() public {
        address[] memory routers = new address[](2);
        routers[0] = makeAddr("r1");
        routers[1] = makeAddr("r2");

        vm.prank(protocolOwner);
        registry.setRouters(routers, true);
        assertTrue(registry.isRouterAllowed(routers[0]));
        assertTrue(registry.isRouterAllowed(routers[1]));

        vm.prank(protocolOwner);
        registry.setRouters(routers, false);
        assertFalse(registry.isRouterAllowed(routers[0]));
    }
}
