// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TideVault — Recurring Investment Vault (ERC4626)
/// @notice Non-custodial vault that holds USDC and executes swaps to targetToken on schedule.
/// @dev MVP: swapData is executed via low-level call to allowlisted aggregator. Executor is keeper (Gelato) or owner.
contract TideVault is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable targetToken;
    uint64 public interval;
    uint64 public nextExecution;
    address public keeper;
    uint16 public slippageBps; // e.g. 100 = 1%
    address public treasury;
    uint16 public feeBps; // 15 = 0.15%
    address public aggregator; // allowlisted DEX aggregator (e.g. 0x router)

    event Deposited(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Executed(uint256 amountIn, uint256 amountOut, uint256 executionPrice, uint256 timestamp, bytes32 indexed executionId);
    event Withdrawn(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);
    event AggregatorUpdated(address indexed oldAggregator, address indexed newAggregator);
    event IntervalUpdated(uint64 oldInterval, uint64 newInterval);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    error NotKeeperOrOwner();
    error NotReady();
    error InvalidAggregator();
    error SlippageExceeded();
    error ZeroAmount();
    error InvalidInterval();

    modifier onlyKeeperOrOwner() {
        if (msg.sender != keeper && msg.sender != owner()) revert NotKeeperOrOwner();
        _;
    }

    /// @param _asset USDC address
    /// @param _targetToken token to accumulate (e.g. AAPL.x)
    /// @param _interval seconds between executions (e.g. 604800 = 7 days)
    /// @param _owner vault owner (user)
    /// @param _keeper Gelato / automation address
    /// @param _treasury fee recipient
    constructor(
        IERC20 _asset,
        IERC20 _targetToken,
        uint64 _interval,
        address _owner,
        address _keeper,
        address _treasury,
        address _aggregator
    ) ERC4626(_asset) ERC20(string.concat("Tide Vault ", IERC20Metadata(address(_asset)).symbol()), string.concat("t", IERC20Metadata(address(_asset)).symbol())) Ownable(_owner) {
        if (_interval == 0) revert InvalidInterval();
        targetToken = _targetToken;
        interval = _interval;
        nextExecution = uint64(block.timestamp + _interval);
        keeper = _keeper;
        treasury = _treasury;
        aggregator = _aggregator;
        slippageBps = 100; // 1%
        feeBps = 15; // 0.15%
        // approve aggregator for USDC (managed via execute, not max approve)
    }

    // Allow owner to update keeper (Gelato rotation)
    function setKeeper(address _keeper) external onlyOwner {
        emit KeeperUpdated(keeper, _keeper);
        keeper = _keeper;
    }

    function setAggregator(address _aggregator) external onlyOwner {
        emit AggregatorUpdated(aggregator, _aggregator);
        aggregator = _aggregator;
    }

    function setInterval(uint64 _interval) external onlyOwner {
        if (_interval == 0) revert InvalidInterval();
        emit IntervalUpdated(interval, _interval);
        interval = _interval;
    }

    function setTreasury(address _treasury) external onlyOwner {
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // --- view helpers ---
    function canExecute() external view returns (bool) {
        return block.timestamp >= nextExecution && !paused() && totalAssets() > 0;
    }

    function timeUntilNext() external view returns (int256) {
        if (block.timestamp >= nextExecution) return 0;
        return int256(uint256(nextExecution)) - int256(block.timestamp);
    }

    // Override to support pausable deposits/withdrawals
    function deposit(uint256 assets, address receiver) public override whenNotPaused nonReentrant returns (uint256) {
        uint256 shares = super.deposit(assets, receiver);
        emit Deposited(msg.sender, receiver, assets, shares);
        return shares;
    }

    function mint(uint256 shares, address receiver) public override whenNotPaused nonReentrant returns (uint256) {
        uint256 assets = super.mint(shares, receiver);
        emit Deposited(msg.sender, receiver, assets, shares);
        return assets;
    }

    function withdraw(uint256 assets, address receiver, address owner_) public override whenNotPaused nonReentrant returns (uint256) {
        uint256 shares = super.withdraw(assets, receiver, owner_);
        emit Withdrawn(msg.sender, receiver, owner_, assets, shares);
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner_) public override whenNotPaused nonReentrant returns (uint256) {
        uint256 assets = super.redeem(shares, receiver, owner_);
        // redeem returns assets, need to emit with correct args
        emit Withdrawn(msg.sender, receiver, owner_, assets, shares);
        return assets;
    }

    /// @notice Execute recurring swap: USDC -> targetToken via aggregator
    /// @param amount USDC amount to swap (must be <= totalAssets)
    /// @param minOut minimum targetToken out (slippage protection, computed off-chain via Pyth + quote)
    /// @param swapData calldata for aggregator (e.g. 0x swap)
    function execute(uint256 amount, uint256 minOut, bytes calldata swapData) external onlyKeeperOrOwner whenNotPaused nonReentrant {
        if (block.timestamp < nextExecution) revert NotReady();
        if (amount == 0) revert ZeroAmount();
        if (amount > totalAssets()) revert ZeroAmount(); // reuse error for insufficient
        if (aggregator == address(0)) revert InvalidAggregator();

        // fee handling
        uint256 fee = (amount * feeBps) / 10000;
        uint256 amountAfterFee = amount - fee;

        // transfer fee to treasury
        if (fee > 0) {
            IERC20(asset()).safeTransfer(treasury, fee);
        }

        // approve aggregator for amountAfterFee
        IERC20(asset()).forceApprove(aggregator, amountAfterFee);

        uint256 balBefore = targetToken.balanceOf(address(this));

        // low-level call to aggregator
        (bool success, bytes memory ret) = aggregator.call(swapData);
        if (!success) {
            // bubble revert reason if present
            if (ret.length > 0) {
                assembly { revert(add(ret, 32), mload(ret)) }
            } else {
                revert("AGGREGATOR_CALL_FAILED");
            }
        }

        uint256 balAfter = targetToken.balanceOf(address(this));
        uint256 amountOut = balAfter - balBefore;
        if (amountOut < minOut) revert SlippageExceeded();

        // execution price: scale to 1e18 for event (amountAfterFee USDC 6 decimals -> target 18 decimals, normalize)
        // price = amountAfterFee / amountOut (USDC per targetToken) — for logging only, not oracle
        nextExecution = uint64(block.timestamp + interval);
        bytes32 executionId = keccak256(abi.encodePacked(block.timestamp, amount, amountOut, msg.sender));

        emit Executed(amountAfterFee, amountOut, amountOut > 0 ? (amountAfterFee * 1e18) / amountOut : 0, block.timestamp, executionId);

        // reset approval
        IERC20(asset()).forceApprove(aggregator, 0);
    }

    // For ERC4626 totalAssets: we hold USDC directly (plus targetToken not counted). MVP: only USDC counts as assets.
    // Future: include targetToken value via oracle.
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }
}
