// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {TideRegistry} from "../src/TideRegistry.sol";
import {Chains} from "./Chains.sol";

/// @title DeployMainnet
/// @notice Deploys TIDE against the real Robinhood Chain market (4663).
/// @dev Wires the natively deployed Uniswap v3 routers and the Chainlink feeds
///      Robinhood publishes for its tokenized equities. Refuses to run anywhere
///      else, because the addresses in Chains.sol only exist on 4663.
contract DeployMainnet is Script {
    error WrongChain(uint256 actual, uint256 expected);

    function run() external {
        if (block.chainid != Chains.MAINNET) revert WrongChain(block.chainid, Chains.MAINNET);

        address deployer = msg.sender;
        address treasury = vm.envOr("TIDE_TREASURY", deployer);
        address keeper = vm.envOr("TIDE_KEEPER", deployer);
        uint16 feeBps = uint16(vm.envOr("TIDE_FEE_BPS", uint256(15)));

        vm.startBroadcast();

        TideRegistry registry = new TideRegistry(deployer, treasury, feeBps, keeper);

        // Routers. SwapRouter02 and UniversalRouter are the call targets; Permit2 is
        // allowlisted because UniversalRouter takes its allowance through Permit2.
        address[] memory routers = new address[](3);
        routers[0] = Chains.UNISWAP_SWAP_ROUTER_02;
        routers[1] = Chains.UNISWAP_UNIVERSAL_ROUTER;
        routers[2] = Chains.PERMIT2;
        registry.setRouters(routers, true);

        // Chainlink feeds. The quote feed matters: USDG is not hard-pegged in the
        // guard, so a depeg tightens the floor rather than silently overpaying.
        registry.setPriceFeed(Chains.USDG, Chains.FEED_USDG);
        registry.setPriceFeed(Chains.AAPL, Chains.FEED_AAPL);
        registry.setPriceFeed(Chains.NVDA, Chains.FEED_NVDA);
        registry.setPriceFeed(Chains.SPY, Chains.FEED_SPY);
        registry.setPriceFeed(Chains.MSFT, Chains.FEED_MSFT);
        registry.setPriceFeed(Chains.GOOGL, Chains.FEED_GOOGL);
        registry.setPriceFeed(Chains.AMZN, Chains.FEED_AMZN);
        registry.setPriceFeed(Chains.QQQ, Chains.FEED_QQQ);
        registry.setPriceFeed(Chains.PLTR, Chains.FEED_PLTR);

        vm.stopBroadcast();

        string memory root = "deployment";
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeBool(root, "simulated", false);
        vm.serializeAddress(root, "implementation", registry.implementation());
        vm.serializeAddress(root, "quote", Chains.USDG);
        vm.serializeAddress(root, "quoteFeed", Chains.FEED_USDG);
        string memory out = vm.serializeAddress(root, "registry", address(registry));
        vm.writeJson(out, string.concat("./deployments/", vm.toString(block.chainid), ".json"));

        console2.log("=== TIDE :: Robinhood Chain 4663 ===");
        console2.log("registry", address(registry));
        console2.log("quote   ", Chains.USDG);
    }
}
