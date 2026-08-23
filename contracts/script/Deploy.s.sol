// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";
import {TideVault} from "../src/TideVault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {MockUSDC, MockTarget, MockAggregator} from "../src/Mocks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployTide is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);
        MockUSDC usdc = new MockUSDC();
        MockTarget aapl = new MockTarget();
        MockAggregator agg = new MockAggregator(address(aapl));
        TideVault impl = new TideVault(IERC20(address(usdc)), IERC20(address(aapl)), 7 days, deployer, deployer, deployer, address(agg));
        VaultFactory factory = new VaultFactory(address(impl), deployer);
        vm.stopBroadcast();
    }
}
