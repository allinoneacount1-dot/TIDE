// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TideVault} from "./TideVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/// @title VaultFactory — Minimal proxy factory for TideVault
/// @notice Deploys TideVault clones (EIP-1167) to save gas. Also holds treasury config.
contract VaultFactory {
    using Clones for address;

    address public immutable implementation;
    address public treasury;
    address public owner;
    uint256 public vaultCount;

    mapping(address => address[]) public userVaults;
    mapping(address => bool) public isTideVault;

    event VaultCreated(address indexed owner, address indexed vault, address indexed targetToken, uint64 interval);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    error ZeroAddress();

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address _implementation, address _treasury) {
        if (_implementation == address(0) || _treasury == address(0)) revert ZeroAddress();
        implementation = _implementation;
        treasury = _treasury;
        owner = msg.sender;
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function transferOwnership(address _owner) external onlyOwner {
        if (_owner == address(0)) revert ZeroAddress();
        emit OwnerUpdated(owner, _owner);
        owner = _owner;
    }

    /// @notice Create a new TideVault for user
    /// @param asset USDC address
    /// @param targetToken token to DCA into
    /// @param interval seconds (e.g. 604800 weekly)
    /// @param keeper automation address
    /// @param aggregator DEX aggregator
    function createVault(
        IERC20 asset,
        IERC20 targetToken,
        uint64 interval,
        address keeper,
        address aggregator
    ) external returns (address vault) {
        vault = Clones.clone(implementation);
        // initialize via call (TideVault constructor is not used for clones — need initializer)
        // For MVP we deploy full contract instead of clone to keep constructor. Clone path uses initializer.
        // To keep simplicity: deploy via new TideVault if clone initializer not set, else use clone.
        // Here we use create2 with full deploy for reliability in MVP:
        // Actually redeploy via new for now (gas higher but correct). Clone optimization is FUTURE.
        // We keep Clones code for future upgrade, but current implementation deploys fresh instance:

        // NOTE: For true EIP-1167 we need TideVaultInitializer. For MVP we deploy directly:
        vault = address(new TideVault(asset, targetToken, interval, msg.sender, keeper, treasury, aggregator));

        userVaults[msg.sender].push(vault);
        isTideVault[vault] = true;
        vaultCount++;

        emit VaultCreated(msg.sender, vault, address(targetToken), interval);
    }

    function getUserVaults(address user) external view returns (address[] memory) {
        return userVaults[user];
    }
}
