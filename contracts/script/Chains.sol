// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title Chains
/// @notice Verified on-chain addresses for Robinhood Chain.
/// @dev Every address here was read from Robinhood's own documentation or confirmed
///      against Blockscout. Nothing in this file is inferred or placeholder. If an
///      address is absent for a network, it is absent because it does not exist
///      there — see the notes on the testnet section.
library Chains {
    uint256 internal constant MAINNET = 4663;
    uint256 internal constant TESTNET = 46630;

    // ------------------------------- mainnet 4663 ------------------------------ //

    /// @notice Global Dollar (Paxos). The chain's stablecoin. 6 decimals.
    /// @dev Robinhood Chain has no canonical Circle USDC. Tokens named "USD Coin"
    ///      on the explorer are impostors with 18 decimals. Never resolve by symbol.
    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    address internal constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address internal constant MULTICALL3 = 0xcA11bde05977b3631167028862bE2a173976CA11;

    // Uniswap v3 is natively deployed on Robinhood Chain.
    address internal constant UNISWAP_SWAP_ROUTER_02 = 0xCaf681a66D020601342297493863E78C959E5cb2;
    address internal constant UNISWAP_UNIVERSAL_ROUTER = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address internal constant UNISWAP_QUOTER_V2 = 0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7;
    address internal constant UNISWAP_V3_FACTORY = 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA;

    // Stock tokens — ERC-20, 18 decimals, plus ERC-8056 `uiMultiplier()`.
    address internal constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;
    address internal constant MSFT = 0xe93237C50D904957Cf27E7B1133b510C669c2e74;
    address internal constant GOOGL = 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3;
    address internal constant AMZN = 0x12f190a9F9d7D37a250758b26824B97CE941bF54;
    address internal constant QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68;
    address internal constant SGOV = 0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5;
    address internal constant PLTR = 0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A;

    // Chainlink Data Feeds. 8 decimals, `us_equities_24/5`, 86400s heartbeat.
    address internal constant FEED_USDG = 0x61B7e5650328764B076A108EFF5fa7282a1B9aD2;
    address internal constant FEED_AAPL = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;
    address internal constant FEED_NVDA = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address internal constant FEED_SPY = 0x319724394D3A0e3669269846abE664Cd621f9f6A;
    address internal constant FEED_MSFT = 0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E;
    address internal constant FEED_GOOGL = 0xF6f373a037c30F0e5010d854385cA89185AE638b;
    address internal constant FEED_AMZN = 0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C;
    address internal constant FEED_QQQ = 0x80901d846d5D7B030F26B480776EE3b29374C2ae;
    address internal constant FEED_PLTR = 0x820ABedFF239034956B7A9d2F0a331f9F075eB4c;

    // ------------------------------ testnet 46630 ------------------------------ //
    //
    // What exists: WETH, Permit2, the bridge contracts, a faucet.
    // What does NOT exist, verified: official stock tokens (the Robinhood asset
    // registry returns chainId 4663 only), any DEX aggregator (0x and 1inch both
    // list 4663 and explicitly not 46630), Uniswap v3, and Chainlink Data Feeds
    // (the reference directory has no testnet file).
    //
    // A testnet deployment therefore has to bring its own market: DeployTestnet.s.sol
    // publishes mock USDG, mock equities, a mock router and mock feeds, and the
    // frontend labels every one of them as simulated. That is the honest way to
    // exercise the full loop on 46630 — not pretending a real market is there.

    address internal constant TESTNET_WETH = 0x7943e237c7F95DA44E0301572D358911207852Fa;

    function isSupported(uint256 chainId) internal pure returns (bool) {
        return chainId == MAINNET || chainId == TESTNET;
    }
}
