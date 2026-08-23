// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {TideVault} from "./TideVault.sol";
import {ITideRegistry} from "./interfaces/ITideRegistry.sol";

/// @title TideRegistry
/// @notice Deploys per-user TideVault clones and holds the protocol-level trust
///         surface: which routers may be called, which price feed guards which
///         asset, the fee, the treasury and the emergency halt.
/// @dev Every parameter here can only ever *tighten* what a vault will do. It can
///      never move user funds, never withdraw, never re-target a plan. A fully
///      compromised registry owner can halt executions and redirect the fee — both
///      bounded by MAX_FEE_BPS — but cannot touch principal or acquired assets.
contract TideRegistry is Ownable2Step, ITideRegistry {
    /// @notice Hard ceiling on the protocol fee. Not governable — compiled in.
    uint16 public constant MAX_FEE_BPS = 50; // 0.50%
    /// @notice Lower bound on the oracle freshness window.
    uint32 public constant MIN_ORACLE_AGE = 1 hours;
    /// @notice Upper bound on the oracle freshness window.
    uint32 public constant MAX_ORACLE_AGE = 7 days;

    /// @notice TideVault implementation that every clone delegates to.
    address public immutable implementation;

    address public treasury;
    uint16 public feeBps;
    address public defaultKeeper;
    /// @notice Oldest acceptable `updatedAt` on a Chainlink answer, in seconds.
    /// @dev Equity feeds are `us_equities_24/5` with an 86400s heartbeat. A window
    ///      shorter than a weekend gap is deliberate: it gates execution to hours
    ///      when the underlying market — and therefore on-chain liquidity — is live.
    uint32 public maxOracleAge;
    /// @notice Protocol-wide execution kill switch. Never blocks withdrawals.
    bool public executionsHalted;

    mapping(address router => bool allowed) public isRouterAllowed;
    mapping(address token => address feed) public priceFeed;
    mapping(address vault => bool created) public isVault;
    mapping(address user => address[] vaults) private _userVaults;

    /// @dev Enumerable for the keeper. Robinhood Chain has neither Chainlink
    ///      Automation nor Gelato, so TIDE runs its own keeper, and that keeper
    ///      needs to discover vaults without scanning ~864,000 blocks a day of
    ///      `VaultCreated` logs. Costs one SSTORE per creation and removes the
    ///      keeper's dependency on an external indexer being reachable.
    address[] private _allVaults;

    event VaultCreated(address indexed owner, address indexed vault, address indexed quote, uint256 index);
    event RouterSet(address indexed router, bool allowed);
    event PriceFeedSet(address indexed token, address indexed feed);
    event TreasurySet(address indexed previous, address indexed current);
    event FeeSet(uint16 previous, uint16 current);
    event DefaultKeeperSet(address indexed previous, address indexed current);
    event MaxOracleAgeSet(uint32 previous, uint32 current);
    event ExecutionsHaltedSet(bool halted);

    error ZeroAddress();
    error FeeTooHigh(uint16 requested, uint16 max);
    error OracleAgeOutOfRange(uint32 requested);

    constructor(address initialOwner, address treasury_, uint16 feeBps_, address defaultKeeper_) Ownable(initialOwner) {
        if (treasury_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_, MAX_FEE_BPS);

        implementation = address(new TideVault());
        treasury = treasury_;
        feeBps = feeBps_;
        defaultKeeper = defaultKeeper_;
        maxOracleAge = 26 hours;

        emit TreasurySet(address(0), treasury_);
        emit FeeSet(0, feeBps_);
        emit DefaultKeeperSet(address(0), defaultKeeper_);
        emit MaxOracleAgeSet(0, 26 hours);
    }

    // --------------------------------------------------------------------- //
    //                              Vault creation                           //
    // --------------------------------------------------------------------- //

    /// @notice Deploy a TideVault owned by the caller.
    /// @param quote Asset the vault spends on every execution (USDG on Robinhood Chain).
    /// @return vault Address of the freshly deployed clone.
    function createVault(address quote) external returns (address vault) {
        if (quote == address(0)) revert ZeroAddress();

        uint256 index = _userVaults[msg.sender].length;
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, index));
        vault = Clones.cloneDeterministic(implementation, salt);
        TideVault(vault).initialize(msg.sender, quote, address(this));

        _userVaults[msg.sender].push(vault);
        _allVaults.push(vault);
        isVault[vault] = true;

        emit VaultCreated(msg.sender, vault, quote, index);
    }

    /// @notice Address a vault will occupy before it is deployed.
    function predictVaultAddress(address user, uint256 index) external view returns (address) {
        return
            Clones.predictDeterministicAddress(implementation, keccak256(abi.encodePacked(user, index)), address(this));
    }

    function getUserVaults(address user) external view returns (address[] memory) {
        return _userVaults[user];
    }

    function userVaultCount(address user) external view returns (uint256) {
        return _userVaults[user].length;
    }

    function vaultCount() external view returns (uint256) {
        return _allVaults.length;
    }

    /// @notice Page through every vault ever created. For the keeper.
    /// @param start Index to begin at.
    /// @param count Maximum number to return; clamped to the end of the list.
    function vaultsSlice(uint256 start, uint256 count) external view returns (address[] memory page) {
        uint256 total = _allVaults.length;
        if (start >= total) return new address[](0);
        uint256 end = start + count;
        if (end > total || end < start) end = total;

        page = new address[](end - start);
        for (uint256 i; i < page.length; ++i) {
            page[i] = _allVaults[start + i];
        }
    }

    // --------------------------------------------------------------------- //
    //                              Configuration                            //
    // --------------------------------------------------------------------- //

    /// @notice Allow or revoke a DEX router that vaults may call during execution.
    /// @dev This is the single most security-critical switch in TIDE: a vault grants
    ///      a scoped, exact-amount, immediately-revoked allowance to this address and
    ///      calls it with keeper-supplied calldata.
    function setRouter(address router, bool allowed) external onlyOwner {
        if (router == address(0)) revert ZeroAddress();
        isRouterAllowed[router] = allowed;
        emit RouterSet(router, allowed);
    }

    function setRouters(address[] calldata routers, bool allowed) external onlyOwner {
        for (uint256 i; i < routers.length; ++i) {
            if (routers[i] == address(0)) revert ZeroAddress();
            isRouterAllowed[routers[i]] = allowed;
            emit RouterSet(routers[i], allowed);
        }
    }

    /// @notice Bind a Chainlink aggregator to a token so executions are price-guarded.
    /// @dev Setting address(0) removes the guard; plans on that token then require an
    ///      owner-set limit price or they cannot execute at all.
    function setPriceFeed(address token, address feed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        priceFeed[token] = feed;
        emit PriceFeedSet(token, feed);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        emit TreasurySet(treasury, treasury_);
        treasury = treasury_;
    }

    function setFeeBps(uint16 feeBps_) external onlyOwner {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_, MAX_FEE_BPS);
        emit FeeSet(feeBps, feeBps_);
        feeBps = feeBps_;
    }

    function setDefaultKeeper(address keeper_) external onlyOwner {
        emit DefaultKeeperSet(defaultKeeper, keeper_);
        defaultKeeper = keeper_;
    }

    function setMaxOracleAge(uint32 age) external onlyOwner {
        if (age < MIN_ORACLE_AGE || age > MAX_ORACLE_AGE) revert OracleAgeOutOfRange(age);
        emit MaxOracleAgeSet(maxOracleAge, age);
        maxOracleAge = age;
    }

    /// @notice Stop all executions protocol-wide. Deposits and withdrawals are unaffected.
    function setExecutionsHalted(bool halted) external onlyOwner {
        executionsHalted = halted;
        emit ExecutionsHaltedSet(halted);
    }
}
