// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {TideRegistry} from "../src/TideRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockRouter} from "../src/mocks/MockRouter.sol";
import {MockAggregatorV3} from "../src/mocks/MockAggregatorV3.sol";

/// @title DeploySimulated
/// @notice Stands up a complete, self-contained TIDE market.
///
/// @dev Use this on Anvil and on Robinhood Chain **testnet (46630)**.
///
///      Testnet needs it because, verified against Robinhood's own asset registry,
///      0x's and 1inch's supported-chain lists, and Chainlink's feed directory:
///      chain 46630 has no official stock tokens, no DEX aggregator, and no price
///      feeds. There is no real market to point at. Rather than wire the UI to
///      nothing — or worse, dress a testnet up as mainnet — this publishes a market
///      that behaves like the real one, and the frontend marks every address it
///      deploys as SIMULATED.
contract DeploySimulated is Script {
    struct Deployment {
        address registry;
        address implementation;
        address usdg;
        address router;
        address usdgFeed;
        address[] targets;
        address[] feeds;
        string[] symbols;
    }

    // Reference prices, 1e8 scale. Starting marks only — the router and feeds are
    // both movable after deployment via `MockRouter.setPrice` / `setAnswer`.
    uint256 internal constant P_AAPL = 182_40000000;
    uint256 internal constant P_NVDA = 121_86000000;
    uint256 internal constant P_SPY = 604_15000000;

    function run() external returns (Deployment memory d) {
        address deployer = msg.sender;
        address treasury = vm.envOr("TIDE_TREASURY", deployer);
        address keeper = vm.envOr("TIDE_KEEPER", deployer);
        uint16 feeBps = uint16(vm.envOr("TIDE_FEE_BPS", uint256(15)));

        vm.startBroadcast();

        MockERC20 usdg = new MockERC20("Global Dollar (simulated)", "USDG", 6);
        MockERC20 aapl = new MockERC20("Apple - Robinhood Token (simulated)", "AAPL", 18);
        MockERC20 nvda = new MockERC20("NVIDIA - Robinhood Token (simulated)", "NVDA", 18);
        MockERC20 spy = new MockERC20("SPDR S&P 500 - Robinhood Token (simulated)", "SPY", 18);

        MockRouter router = new MockRouter(6, 18, P_AAPL);

        MockAggregatorV3 usdgFeed = new MockAggregatorV3(8, 1_00000000, "USDG / USD (simulated)");
        MockAggregatorV3 aaplFeed = new MockAggregatorV3(8, int256(P_AAPL), "AAPL / USD (simulated)");
        MockAggregatorV3 nvdaFeed = new MockAggregatorV3(8, int256(P_NVDA), "NVDA / USD (simulated)");
        MockAggregatorV3 spyFeed = new MockAggregatorV3(8, int256(P_SPY), "SPY / USD (simulated)");

        TideRegistry registry = new TideRegistry(deployer, treasury, feeBps, keeper);
        registry.setRouter(address(router), true);
        registry.setPriceFeed(address(usdg), address(usdgFeed));
        registry.setPriceFeed(address(aapl), address(aaplFeed));
        registry.setPriceFeed(address(nvda), address(nvdaFeed));
        registry.setPriceFeed(address(spy), address(spyFeed));

        // Seed the router so it can settle trades, and the deployer so it can trade.
        usdg.mint(deployer, 1_000_000e6);

        vm.stopBroadcast();

        d.registry = address(registry);
        d.implementation = registry.implementation();
        d.usdg = address(usdg);
        d.router = address(router);
        d.usdgFeed = address(usdgFeed);

        d.targets = new address[](3);
        d.feeds = new address[](3);
        d.symbols = new string[](3);
        d.targets[0] = address(aapl);
        d.feeds[0] = address(aaplFeed);
        d.symbols[0] = "AAPL";
        d.targets[1] = address(nvda);
        d.feeds[1] = address(nvdaFeed);
        d.symbols[1] = "NVDA";
        d.targets[2] = address(spy);
        d.feeds[2] = address(spyFeed);
        d.symbols[2] = "SPY";

        _write(d);
        _log(d);
    }

    function _write(Deployment memory d) internal {
        string memory root = "deployment";
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeBool(root, "simulated", true);
        vm.serializeAddress(root, "registry", d.registry);
        vm.serializeAddress(root, "implementation", d.implementation);
        vm.serializeAddress(root, "quote", d.usdg);
        vm.serializeAddress(root, "quoteFeed", d.usdgFeed);
        vm.serializeAddress(root, "router", d.router);
        vm.serializeAddress(root, "targets", d.targets);
        vm.serializeString(root, "symbols", d.symbols);
        string memory out = vm.serializeAddress(root, "feeds", d.feeds);

        vm.writeJson(out, string.concat("./deployments/", vm.toString(block.chainid), ".json"));
    }

    function _log(Deployment memory d) internal pure {
        console2.log("");
        console2.log("=== TIDE :: simulated market deployed ===");
        console2.log("registry      ", d.registry);
        console2.log("implementation", d.implementation);
        console2.log("quote (USDG)  ", d.usdg);
        console2.log("router        ", d.router);
        console2.log("AAPL          ", d.targets[0]);
        console2.log("NVDA          ", d.targets[1]);
        console2.log("SPY           ", d.targets[2]);
        console2.log("");
        console2.log("Every asset above is SIMULATED. Do not present it as a real market.");
    }
}
