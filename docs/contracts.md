# Contracts

Solidity 0.8.28, `evm_version = shanghai`, optimizer at 20,000 runs, `via_ir`.

Shanghai rather than Cancun deliberately: it avoids depending on `TSTORE`/`MCOPY`,
whose availability varies by ArbOS version.

---

## TideRegistry

One per chain. Holds protocol configuration and deploys vaults. Holds no capital
and has no function that can move any.

### Constants

| | |
|---|---|
| `MAX_FEE_BPS` | `50` (0.50%). Not governable — compiled in |
| `MIN_ORACLE_AGE` | `1 hours` |
| `MAX_ORACLE_AGE` | `7 days` |

### State

| | |
|---|---|
| `implementation` | Immutable. The `TideVault` all clones delegate to |
| `treasury`, `feeBps` | Fee destination and rate, capped by `MAX_FEE_BPS` |
| `defaultKeeper` | Inherited by new vaults; each owner can override |
| `maxOracleAge` | Freshness window for Chainlink answers. Default 26h |
| `executionsHalted` | Protocol-wide execution stop. Never affects withdrawal |
| `isRouterAllowed` | The single most security-critical mapping in TIDE |
| `priceFeed` | token → Chainlink aggregator |

### Functions

```solidity
function createVault(address quote) external returns (address vault);
function predictVaultAddress(address user, uint256 index) external view returns (address);
function getUserVaults(address user) external view returns (address[] memory);
function vaultsSlice(uint256 start, uint256 count) external view returns (address[] memory);
```

`vaultsSlice` exists for the keeper. With ~100ms blocks, discovering vaults by
scanning `VaultCreated` logs is not practical, and making the keeper depend on an
external indexer being reachable would make execution depend on it too.

### Events

`VaultCreated`, `RouterSet`, `PriceFeedSet`, `TreasurySet`, `FeeSet`,
`DefaultKeeperSet`, `MaxOracleAgeSet`, `ExecutionsHaltedSet`.

---

## TideVault

One per user. `Initializable`, `Pausable`, `ReentrancyGuard`, with two-step
ownership. Deployed as an EIP-1167 clone; the implementation calls
`_disableInitializers()` in its constructor and can never be owned or used.

### Plan

```solidity
struct Plan {
    address target;          // asset accumulated. immutable for the plan's life
    uint16  maxSlippageBps;  // tolerance below the oracle reference
    bool    active;
    uint8   targetDecimals;  // cached at creation
    uint32  cyclesExecuted;
    uint32  cyclesTotal;     // 0 = open-ended
    uint128 amountPerCycle;  // quote base units
    uint64  interval;        // seconds
    uint64  nextExecution;   // unix timestamp
    uint128 limitPrice;      // max quote per whole target, 1e8. 0 = oracle only
    uint128 totalIn;         // lifetime quote spent, net of fees
    uint256 totalOut;        // lifetime target acquired
}
```

Four storage slots.

### Readiness

`canExecute(planId)` returns `(bool ready, Readiness reason, uint256 referencePrice)`.
The reason code is the contract's answer to "why is nothing happening", and the
interface renders it verbatim.

| | | |
|---|---|---|
| 0 | `Ready` | Window open, all guards pass |
| 1 | `PlanInactive` | Owner disarmed it |
| 2 | `PlanComplete` | `cyclesTotal` reached |
| 3 | `NotDue` | Waiting for the window |
| 4 | `InsufficientCapital` | Idle balance below one cycle |
| 5 | `VaultPaused` | Owner paused the vault |
| 6 | `ProtocolHalted` | Registry-level stop |
| 7 | `OracleStale` | Feed older than `maxOracleAge`, or invalid |
| 8 | `Unguarded` | No feed and no limit price. Never executable |

### Execution

```solidity
function execute(
    uint256 planId,
    uint256 minOut,
    address router,
    address spender,   // address(0) → router. 0x AllowanceHolder needs these to differ
    bytes calldata swapData
) external;
```

In order:

1. Caller is owner or keeper.
2. `_readiness` must be `Ready`.
3. `router` **and** `spender` must both be registry-allowlisted.
4. Fee split, clamped locally against `MAX_FEE_BPS`.
5. Floor computed: `max(ownerLimitFloor, oracleBandFloor, minOut)`.
6. Fee transferred to treasury.
7. Exact-amount approval → `router.call(swapData)` → approval revoked to zero.
8. Spend verified `<= amountAfterFee` (`OverSpend`).
9. Output measured as the target-balance delta, checked against the floor.
10. Cadence advanced; totals updated; `Executed` emitted.

### Price scale

A price throughout TIDE means **whole quote units per whole target unit, ×1e8**.
This matches Chainlink's convention on Robinhood Chain, so the contract, the
keeper and the interface share one unit and nothing is rescaled ad hoc.

```
price       = amountIn · 10^targetDec · 1e8 / (10^quoteDec · amountOut)
impliedOut  = amountIn · 10^targetDec · 1e8 / (10^quoteDec · price)
```

`PriceMath` is fuzz-tested for round-trip accuracy, monotonicity, and a
truncation bound of at most one unit across decimal combinations from 2 to 18.

### Cadence

```solidity
uint64 next = p.nextExecution + p.interval;
if (next <= block.timestamp) next = uint64(block.timestamp) + p.interval;
```

Advancing from the *scheduled* window keeps the grid when a keeper is a little
late. Clamping forward prevents a burst of catch-up executions after an outage —
twelve backdated buys at whatever the price happens to be is not what a
disciplined schedule means.

---

## Invariants

Verified with 128 runs × 32 calls each against a handler that drives deposits,
plan creation, executions, withdrawals, pausing and router slippage.

| | |
|---|---|
| `invariant_NoStandingAllowance` | No allowance outlives its transaction |
| `invariant_FeeNeverExceedsCeiling` | Protocol take stays under `MAX_FEE_BPS` |
| `invariant_SpendBoundedByCycles` | `totalIn ≤ amountPerCycle × cyclesExecuted` |
| `invariant_AcquiredAssetsAreHeldOrWithdrawn` | Balance equals the sum bought |
| `invariant_OwnerCanAlwaysExit` | `exitAll` succeeds in every reachable state |

The last one is the important one. It is checked from a snapshot in every state
the handler can reach — paused, halted, oracle down, mid-plan — and asserts the
vault is empty afterwards.

---

## Threat model

See [security.md](security.md) for what a compromise of each role actually buys
an attacker.
