// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ITideRegistry} from "./interfaces/ITideRegistry.sol";
import {IAggregatorV3} from "./interfaces/IAggregatorV3.sol";
import {PriceMath} from "./libraries/PriceMath.sol";

/// @title TideVault
/// @notice A single-owner vault that holds quote capital and converts it into
///         tokenized equities on a schedule the owner sets.
///
/// @dev Design notes that matter for anyone auditing this:
///
///      1. **The owner is the only party who can move value out.** The keeper can
///         only trigger `execute`, and `execute` can only convert quote into the
///         plan's declared target asset, inside a price band the owner set. There
///         is no path by which the keeper, the registry owner, or the router
///         receives principal or acquired assets.
///
///      2. **Execution is never unguarded.** A plan must have an owner-set
///         `limitPrice`, or a registry-bound Chainlink feed, or both. Where both
///         exist the tighter floor wins. `minOut` supplied by the keeper may only
///         raise that floor, never lower it — so a compromised keeper submitting
///         `minOut = 0` still cannot execute at a bad price.
///
///      3. **Every asset the vault can hold, it can also return.** Acquired equity
///         tokens are withdrawable by address, not just the quote asset. This is
///         deliberate: a vault that can accumulate an asset it cannot release is a
///         vault that loses funds.
///
///      4. **`paused` never blocks the exit.** Pausing stops deposits and
///         executions. Withdrawals stay open in every state, including a
///         protocol-wide halt.
contract TideVault is Initializable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --------------------------------------------------------------------- //
    //                                  Types                                //
    // --------------------------------------------------------------------- //

    struct Plan {
        address target; // asset being accumulated
        uint16 maxSlippageBps; // tolerance below the oracle reference
        bool active; // owner can arm/disarm without losing history
        uint8 targetDecimals; // cached at creation; targets are immutable per plan
        uint32 cyclesExecuted;
        uint32 cyclesTotal; // 0 = open-ended
        uint128 amountPerCycle; // quote base units spent per execution
        uint64 interval; // seconds between executions
        uint64 nextExecution; // unix timestamp of the next open window
        uint128 limitPrice; // max price the owner will pay, 1e8 scale; 0 = oracle only
        uint128 totalIn; // lifetime quote spent, net of fees
        uint256 totalOut; // lifetime target acquired
    }

    /// @notice Machine-readable reason a plan cannot execute right now.
    /// @dev Surfaced verbatim in the UI so "why is nothing happening" is always answerable.
    enum Readiness {
        Ready, // 0
        PlanInactive, // 1
        PlanComplete, // 2
        NotDue, // 3
        InsufficientCapital, // 4
        VaultPaused, // 5
        ProtocolHalted, // 6
        OracleStale, // 7
        Unguarded // 8
    }

    // --------------------------------------------------------------------- //
    //                                 Storage                               //
    // --------------------------------------------------------------------- //

    /// @notice Hard ceiling the vault applies to whatever fee the registry reports.
    /// @dev Compiled in, not governable. Registry has the same ceiling; this is the
    ///      second, independent enforcement so a registry bug cannot overcharge.
    uint16 public constant MAX_FEE_BPS = 50; // 0.50%
    uint16 public constant MAX_SLIPPAGE_BPS = 1000; // 10%
    uint64 public constant MIN_INTERVAL = 1 hours;
    uint64 public constant MAX_INTERVAL = 365 days;
    uint64 public constant MAX_START_DELAY = 365 days;
    uint256 private constant BPS = 10_000;

    ITideRegistry public registry;
    address public owner;
    address public pendingOwner;
    /// @notice Address permitted to call `execute` alongside the owner.
    address public keeper;
    address public quote;
    uint8 public quoteDecimals;

    Plan[] private _plans;

    // --------------------------------------------------------------------- //
    //                                  Events                               //
    // --------------------------------------------------------------------- //

    event Initialized(address indexed owner, address indexed quote, address indexed registry);
    event Deposited(address indexed from, uint256 amount, uint256 idleAfter);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event PlanCreated(
        uint256 indexed planId,
        address indexed target,
        uint128 amountPerCycle,
        uint64 interval,
        uint64 firstExecution,
        uint128 limitPrice,
        uint16 maxSlippageBps,
        uint32 cyclesTotal
    );
    event PlanUpdated(
        uint256 indexed planId,
        uint128 amountPerCycle,
        uint64 interval,
        uint128 limitPrice,
        uint16 maxSlippageBps,
        uint32 cyclesTotal
    );
    event PlanActiveSet(uint256 indexed planId, bool active);
    event Executed(
        uint256 indexed planId,
        address indexed target,
        address indexed router,
        uint256 amountIn,
        uint256 fee,
        uint256 amountOut,
        uint256 price,
        uint256 referencePrice,
        uint32 cycle,
        uint64 nextExecution
    );
    event KeeperSet(address indexed previous, address indexed current);
    event OwnershipTransferStarted(address indexed previous, address indexed pending);
    event OwnershipTransferred(address indexed previous, address indexed current);

    // --------------------------------------------------------------------- //
    //                                  Errors                               //
    // --------------------------------------------------------------------- //

    error NotOwner();
    error NotOwnerOrKeeper();
    error NotPendingOwner();
    error ZeroAddress();
    error ZeroAmount();
    error NotReady(Readiness reason);
    error RouterNotAllowed(address router);
    error SpenderNotAllowed(address spender);
    error SlippageExceeded(uint256 received, uint256 required);
    error OverSpend(uint256 spent, uint256 allowed);
    error InvalidInterval(uint64 interval);
    error InvalidSlippage(uint16 bps);
    error InvalidPlan(uint256 planId);
    error TargetIsQuote();
    error SwapFailed(bytes reason);
    error OracleAnswerInvalid(address feed);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        // The implementation itself must never be usable or ownable.
        _disableInitializers();
    }

    /// @notice Bind a freshly cloned vault to its owner. Callable exactly once.
    function initialize(address owner_, address quote_, address registry_) external initializer {
        if (owner_ == address(0) || quote_ == address(0) || registry_ == address(0)) revert ZeroAddress();
        owner = owner_;
        quote = quote_;
        registry = ITideRegistry(registry_);
        quoteDecimals = IERC20Metadata(quote_).decimals();
        keeper = ITideRegistry(registry_).defaultKeeper();
        emit Initialized(owner_, quote_, registry_);
        emit KeeperSet(address(0), keeper);
    }

    // --------------------------------------------------------------------- //
    //                                 Capital                               //
    // --------------------------------------------------------------------- //

    /// @notice Move quote capital into the vault. Anyone may fund a vault; only the
    ///         owner may ever take value out.
    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        IERC20(quote).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, IERC20(quote).balanceOf(address(this)));
    }

    /// @notice Withdraw any token the vault holds — idle quote or acquired equity.
    /// @dev Intentionally available while paused and while the protocol is halted.
    ///      The exit is never gated.
    function withdraw(address token, uint256 amount, address to) public onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    /// @notice Withdraw the vault's entire balance of `token`.
    function withdrawAll(address token, address to) external {
        withdraw(token, IERC20(token).balanceOf(address(this)), to);
    }

    /// @notice Withdraw every asset touched by this vault in one transaction.
    /// @dev Quote first, then each distinct plan target. Zero balances are skipped
    ///      rather than reverting so a partial exit never blocks a full one.
    function exitAll(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        uint256 idle = IERC20(quote).balanceOf(address(this));
        if (idle > 0) {
            IERC20(quote).safeTransfer(to, idle);
            emit Withdrawn(quote, to, idle);
        }

        uint256 n = _plans.length;
        for (uint256 i; i < n; ++i) {
            address target = _plans[i].target;
            uint256 bal = IERC20(target).balanceOf(address(this));
            if (bal == 0) continue;
            IERC20(target).safeTransfer(to, bal);
            emit Withdrawn(target, to, bal);
        }
    }

    // --------------------------------------------------------------------- //
    //                                  Plans                                //
    // --------------------------------------------------------------------- //

    /// @notice Define a recurring purchase.
    /// @param target Asset to accumulate.
    /// @param amountPerCycle Quote spent per execution, in quote base units.
    /// @param interval Seconds between executions.
    /// @param startDelay Seconds until the first window opens. 0 arms it immediately.
    /// @param limitPrice Highest price the owner will pay, 1e8 scale. 0 defers
    ///        entirely to the registry's price feed for this target — which must
    ///        then exist, or the plan can never execute.
    /// @param maxSlippageBps Tolerance below the oracle reference price.
    /// @param cyclesTotal Number of executions before the plan retires. 0 = open-ended.
    function createPlan(
        address target,
        uint128 amountPerCycle,
        uint64 interval,
        uint64 startDelay,
        uint128 limitPrice,
        uint16 maxSlippageBps,
        uint32 cyclesTotal
    ) external onlyOwner returns (uint256 planId) {
        if (target == address(0)) revert ZeroAddress();
        if (target == quote) revert TargetIsQuote();
        if (amountPerCycle == 0) revert ZeroAmount();
        if (interval < MIN_INTERVAL || interval > MAX_INTERVAL) revert InvalidInterval(interval);
        if (maxSlippageBps > MAX_SLIPPAGE_BPS) revert InvalidSlippage(maxSlippageBps);
        if (startDelay > MAX_START_DELAY) revert InvalidInterval(startDelay);

        uint64 firstExecution = uint64(block.timestamp) + startDelay;

        planId = _plans.length;
        _plans.push(
            Plan({
                target: target,
                maxSlippageBps: maxSlippageBps,
                active: true,
                targetDecimals: IERC20Metadata(target).decimals(),
                cyclesExecuted: 0,
                cyclesTotal: cyclesTotal,
                amountPerCycle: amountPerCycle,
                interval: interval,
                nextExecution: firstExecution,
                limitPrice: limitPrice,
                totalIn: 0,
                totalOut: 0
            })
        );

        emit PlanCreated(
            planId, target, amountPerCycle, interval, firstExecution, limitPrice, maxSlippageBps, cyclesTotal
        );
    }

    /// @notice Adjust the economics of an existing plan. The target asset is immutable.
    function updatePlan(
        uint256 planId,
        uint128 amountPerCycle,
        uint64 interval,
        uint128 limitPrice,
        uint16 maxSlippageBps,
        uint32 cyclesTotal
    ) external onlyOwner {
        Plan storage p = _plan(planId);
        if (amountPerCycle == 0) revert ZeroAmount();
        if (interval < MIN_INTERVAL || interval > MAX_INTERVAL) revert InvalidInterval(interval);
        if (maxSlippageBps > MAX_SLIPPAGE_BPS) revert InvalidSlippage(maxSlippageBps);

        p.amountPerCycle = amountPerCycle;
        p.maxSlippageBps = maxSlippageBps;
        p.limitPrice = limitPrice;
        p.cyclesTotal = cyclesTotal;

        // Re-cadence from now rather than silently keeping a stale window that a
        // shortened interval would make immediately, repeatedly executable.
        if (p.interval != interval) {
            p.interval = interval;
            uint64 recadenced = uint64(block.timestamp) + interval;
            if (recadenced < p.nextExecution) p.nextExecution = recadenced;
        }

        emit PlanUpdated(planId, amountPerCycle, interval, limitPrice, maxSlippageBps, cyclesTotal);
    }

    /// @notice Arm or disarm a plan without discarding its history.
    function setPlanActive(uint256 planId, bool active) external onlyOwner {
        Plan storage p = _plan(planId);
        p.active = active;
        // Re-arming does not backdate: the next window opens a full interval out.
        if (active && p.nextExecution < block.timestamp) {
            p.nextExecution = uint64(block.timestamp) + p.interval;
        }
        emit PlanActiveSet(planId, active);
    }

    // --------------------------------------------------------------------- //
    //                                Execution                              //
    // --------------------------------------------------------------------- //

    /// @notice Convert one cycle of quote capital into the plan's target asset.
    /// @param planId Plan to execute.
    /// @param minOut Keeper's own floor, from its live quote. May only tighten the
    ///        on-chain floor, never loosen it.
    /// @param router Allowlisted contract to call with `swapData`.
    /// @param spender Allowlisted contract to approve. Pass address(0) to use
    ///        `router`. 0x AllowanceHolder and Permit2 flows need these to differ.
    /// @param swapData Calldata produced by the aggregator.
    function execute(uint256 planId, uint256 minOut, address router, address spender, bytes calldata swapData)
        external
        nonReentrant
    {
        if (msg.sender != owner && msg.sender != keeper) revert NotOwnerOrKeeper();

        Plan storage p = _plan(planId);

        (Readiness r, uint256 referencePrice) = _readiness(p);
        if (r != Readiness.Ready) revert NotReady(r);

        if (!registry.isRouterAllowed(router)) revert RouterNotAllowed(router);
        address approvalTarget = spender == address(0) ? router : spender;
        if (!registry.isRouterAllowed(approvalTarget)) revert SpenderNotAllowed(approvalTarget);

        (uint256 feeAmount, uint256 amountAfterFee) = _splitFee(p.amountPerCycle);

        // The keeper's own floor may only tighten what the chain already requires.
        uint256 requiredOut = _floorOut(p, amountAfterFee, referencePrice);
        if (minOut > requiredOut) requiredOut = minOut;

        if (feeAmount > 0) {
            IERC20(quote).safeTransfer(registry.treasury(), feeAmount);
        }

        (uint256 spent, uint256 amountOut) = _swap(p.target, router, approvalTarget, amountAfterFee, swapData);
        if (amountOut < requiredOut) revert SlippageExceeded(amountOut, requiredOut);

        _settle(p, spent, amountOut);

        emit Executed(
            planId,
            p.target,
            router,
            spent,
            feeAmount,
            amountOut,
            PriceMath.impliedPrice(spent, amountOut, quoteDecimals, p.targetDecimals),
            referencePrice,
            p.cyclesExecuted,
            p.nextExecution
        );
    }

    /// @dev Grants an exact-amount allowance, calls the router, and revokes the
    ///      allowance before inspecting the result. Output is measured as a balance
    ///      delta so a router that under-delivers, over-delivers or returns a lie in
    ///      its return data cannot influence accounting.
    function _swap(
        address target,
        address router,
        address approvalTarget,
        uint256 amountAfterFee,
        bytes calldata swapData
    ) private returns (uint256 spent, uint256 amountOut) {
        IERC20 quoteToken = IERC20(quote);
        IERC20 targetToken = IERC20(target);

        uint256 quoteBefore = quoteToken.balanceOf(address(this));
        uint256 targetBefore = targetToken.balanceOf(address(this));

        quoteToken.forceApprove(approvalTarget, amountAfterFee);
        (bool ok, bytes memory ret) = router.call(swapData);
        quoteToken.forceApprove(approvalTarget, 0);
        if (!ok) revert SwapFailed(ret);

        spent = quoteBefore - quoteToken.balanceOf(address(this));
        if (spent > amountAfterFee) revert OverSpend(spent, amountAfterFee);

        amountOut = targetToken.balanceOf(address(this)) - targetBefore;
    }

    /// @dev Advances the cadence and folds the trade into lifetime totals.
    function _settle(Plan storage p, uint256 spent, uint256 amountOut) private {
        // Advance from the scheduled window so cadence does not drift, but never
        // schedule into the past: a long outage must not licence a burst of
        // back-to-back catch-up executions.
        uint64 next = p.nextExecution + p.interval;
        if (next <= block.timestamp) next = uint64(block.timestamp) + p.interval;
        p.nextExecution = next;

        unchecked {
            p.cyclesExecuted += 1;
        }
        // `spent` is bounded above by amountAfterFee, itself bounded by the uint128
        // `amountPerCycle`, so the narrowing cannot truncate. The `+=` still reverts
        // on accumulation overflow.
        // forge-lint: disable-next-line(unsafe-typecast)
        p.totalIn += uint128(spent);
        p.totalOut += amountOut;
        if (p.cyclesTotal != 0 && p.cyclesExecuted >= p.cyclesTotal) p.active = false;
    }

    /// @dev Fee is read from the registry but clamped locally, so a registry bug or
    ///      a compromised registry owner still cannot overcharge past MAX_FEE_BPS.
    function _splitFee(uint256 amount) private view returns (uint256 feeAmount, uint256 amountAfterFee) {
        uint16 fee = registry.feeBps();
        if (fee > MAX_FEE_BPS) fee = MAX_FEE_BPS;
        feeAmount = (amount * fee) / BPS;
        amountAfterFee = amount - feeAmount;
    }

    /// @notice Why a plan can or cannot execute right now, and the reference price
    ///         the on-chain guard would use.
    function canExecute(uint256 planId) external view returns (bool ready, Readiness reason, uint256 referencePrice) {
        Plan storage p = _plan(planId);
        (reason, referencePrice) = _readiness(p);
        ready = reason == Readiness.Ready;
    }

    /// @notice Minimum target amount an execution of `planId` would have to return.
    /// @dev The keeper calls this to sanity-check its aggregator quote before
    ///      spending gas on a transaction that would revert.
    function requiredOutFor(uint256 planId) external view returns (uint256) {
        Plan storage p = _plan(planId);
        (, uint256 referencePrice) = _readiness(p);
        (, uint256 amountAfterFee) = _splitFee(p.amountPerCycle);
        return _floorOut(p, amountAfterFee, referencePrice);
    }

    // --------------------------------------------------------------------- //
    //                                  Views                                //
    // --------------------------------------------------------------------- //

    function plansLength() external view returns (uint256) {
        return _plans.length;
    }

    function getPlan(uint256 planId) external view returns (Plan memory) {
        return _plan(planId);
    }

    function getPlans() external view returns (Plan[] memory) {
        return _plans;
    }

    /// @notice Idle quote capital not yet deployed.
    function idleCapital() external view returns (uint256) {
        return IERC20(quote).balanceOf(address(this));
    }

    /// @notice Balance of every distinct asset this vault has ever targeted.
    function exposure() external view returns (address[] memory tokens, uint256[] memory balances) {
        uint256 n = _plans.length;
        address[] memory seen = new address[](n);
        uint256 count;

        for (uint256 i; i < n; ++i) {
            address t = _plans[i].target;
            bool dup;
            for (uint256 j; j < count; ++j) {
                if (seen[j] == t) {
                    dup = true;
                    break;
                }
            }
            if (!dup) {
                seen[count] = t;
                unchecked {
                    ++count;
                }
            }
        }

        tokens = new address[](count);
        balances = new uint256[](count);
        for (uint256 i; i < count; ++i) {
            tokens[i] = seen[i];
            balances[i] = IERC20(seen[i]).balanceOf(address(this));
        }
    }

    // --------------------------------------------------------------------- //
    //                              Administration                           //
    // --------------------------------------------------------------------- //

    function setKeeper(address keeper_) external onlyOwner {
        emit KeeperSet(keeper, keeper_);
        keeper = keeper_;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    // --------------------------------------------------------------------- //
    //                                Internals                              //
    // --------------------------------------------------------------------- //

    function _plan(uint256 planId) private view returns (Plan storage) {
        if (planId >= _plans.length) revert InvalidPlan(planId);
        return _plans[planId];
    }

    function _readiness(Plan storage p) private view returns (Readiness, uint256 referencePrice) {
        bool hasFeed;
        (referencePrice, hasFeed) = _referencePrice(p.target);

        if (!p.active) return (Readiness.PlanInactive, referencePrice);
        if (p.cyclesTotal != 0 && p.cyclesExecuted >= p.cyclesTotal) return (Readiness.PlanComplete, referencePrice);
        if (block.timestamp < p.nextExecution) return (Readiness.NotDue, referencePrice);
        if (paused()) return (Readiness.VaultPaused, referencePrice);
        if (registry.executionsHalted()) return (Readiness.ProtocolHalted, referencePrice);
        if (IERC20(quote).balanceOf(address(this)) < p.amountPerCycle) {
            return (Readiness.InsufficientCapital, referencePrice);
        }
        if (hasFeed && referencePrice == 0) return (Readiness.OracleStale, referencePrice);
        if (!hasFeed && p.limitPrice == 0) return (Readiness.Unguarded, referencePrice);

        return (Readiness.Ready, referencePrice);
    }

    /// @dev The floor an execution must clear: the owner's limit price and the
    ///      oracle band are both applied, and the tighter of the two wins.
    function _floorOut(Plan storage p, uint256 amountAfterFee, uint256 referencePrice)
        private
        view
        returns (uint256 floorOut)
    {
        if (p.limitPrice != 0) {
            floorOut = PriceMath.impliedOut(amountAfterFee, p.limitPrice, quoteDecimals, p.targetDecimals);
        }
        if (referencePrice != 0) {
            uint256 atOracle = PriceMath.impliedOut(amountAfterFee, referencePrice, quoteDecimals, p.targetDecimals);
            uint256 band = (atOracle * (BPS - p.maxSlippageBps)) / BPS;
            if (band > floorOut) floorOut = band;
        }
    }

    /// @dev Price of `target` denominated in the quote asset, 1e8 scale.
    ///      Returns (0, true) when a feed exists but its answer is stale or invalid,
    ///      which `_readiness` reports as OracleStale rather than reverting, so the
    ///      UI can explain the wait instead of showing an opaque failure.
    function _referencePrice(address target) private view returns (uint256 price, bool hasFeed) {
        address feed = registry.priceFeed(target);
        if (feed == address(0)) return (0, false);
        hasFeed = true;

        uint256 targetUsd = _readFeed(feed);
        if (targetUsd == 0) return (0, true);

        address quoteFeed = registry.priceFeed(quote);
        if (quoteFeed == address(0)) return (targetUsd, true);

        uint256 quoteUsd = _readFeed(quoteFeed);
        if (quoteUsd == 0) return (0, true);

        price = (targetUsd * PriceMath.PRICE_SCALE) / quoteUsd;
    }

    /// @dev Returns 0 for a stale, negative or zero answer rather than reverting.
    function _readFeed(address feed) private view returns (uint256) {
        try IAggregatorV3(feed).latestRoundData() returns (uint80, int256 answer, uint256, uint256 updatedAt, uint80) {
            if (answer <= 0) return 0;
            if (updatedAt == 0) return 0;
            if (block.timestamp > updatedAt && block.timestamp - updatedAt > registry.maxOracleAge()) return 0;
            uint8 dec = IAggregatorV3(feed).decimals();
            // `answer <= 0` is rejected above, so the value is a positive int256 and
            // widening it to uint256 is exact.
            // forge-lint: disable-next-line(unsafe-typecast)
            return PriceMath.normalize(uint256(answer), dec);
        } catch {
            return 0;
        }
    }
}
