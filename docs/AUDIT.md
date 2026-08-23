# Audit

What the previous build got wrong, and what changed. Every finding below was
verified against the code at commit `7defa84`, not inferred.

---

## Critical

### 1. Acquired assets were permanently unwithdrawable

`TideVault` was an ERC-4626 vault over USDC whose `execute()` swapped USDC into a
target token — but `totalAssets()` returned only the USDC balance, and the
contract had **no function capable of transferring the target token out**.

```solidity
// old TideVault.sol
function totalAssets() public view override returns (uint256) {
    return IERC20(asset()).balanceOf(address(this));
}
```

Consequences, all of them realised on the first execution:

- Every unit of the target asset the vault ever bought was stranded forever.
- `totalAssets()` fell by the swapped amount while share supply was unchanged,
  so the share price collapsed proportionally on every execution.
- A depositor withdrawing after an execution received only the *unspent* USDC,
  pro rata. The value that had been converted was simply gone.

The closed loop advertised in the README — ending in `Withdraw` — could not
complete. This is a total loss of the converted principal.

**Why the tests did not catch it.** `MockAggregator.mockSwap` minted the target
token to the caller without ever taking the input:

```solidity
function mockSwap(uint256 amountIn) external {
    uint256 out = amountIn * 1e12;
    MockTarget(target).mint(msg.sender, out);   // nothing is spent
}
```

So in tests the vault ended each "swap" holding both its USDC and the target,
and the accounting bug was invisible. A mock that does not spend the input
cannot test a contract whose bug is that it mis-accounts the input.

**Fixed.** The vault is no longer ERC-4626. ERC-4626 models a single-asset
position; a DCA vault holds two assets by design, and pricing shares across both
would put an oracle in the middle of share accounting — a manipulation surface
for no benefit, since the factory already created one vault per user. The vault
is now a single-owner, multi-plan contract with `withdraw(token, amount, to)`,
`withdrawAll` and `exitAll`, so every asset it can accumulate it can return.
`MockRouter` now pulls the input through the allowance like a real router, and
`invariant_AcquiredAssetsAreHeldOrWithdrawn` asserts the balance matches the sum
of what was bought.

### 2. A keeper could drain a cycle at any price

`execute(amount, minOut, swapData)` took `minOut` from the caller and used it
verbatim. The caller is the keeper.

```solidity
uint256 amountOut = balAfter - balBefore;
if (amountOut < minOut) revert SlippageExceeded();   // minOut supplied by keeper
```

A compromised or malicious keeper called `execute(amount, 0, swapData)` with a
route of its choosing and extracted the entire cycle's capital, bounded only by
`amount` and the interval. The plan's "1% slippage" was a UI string with no
on-chain enforcement.

**Fixed.** The floor is computed on chain from the owner's limit price and the
registry's Chainlink feed, and `minOut` may only tighten it:

```solidity
uint256 requiredOut = _floorOut(p, amountAfterFee, referencePrice);
if (minOut > requiredOut) requiredOut = minOut;
```

Covered by `test_Keeper_CannotWeakenSlippageFloor` and
`test_Keeper_CannotExecuteAboveOwnerLimitPrice`.

### 3. Unbounded arbitrary call with a live allowance

`execute` granted the aggregator an allowance and then called it with fully
attacker-controlled calldata. Combined with (2), any route was reachable. There
was no protocol-level allowlist — `aggregator` was set per vault by whoever
called `createVault`, and the factory validated nothing.

**Fixed.** Both the call target and the approval target must be on a
registry-level allowlist; the allowance is exact-amount and revoked in the same
transaction; and spend is verified against the intended amount
(`OverSpend`). `HostileRouter` exercises theft, re-entrancy and allowance-drain
paths in the test suite.

---

## High

### 4. `VaultFactory` deployed and abandoned a contract on every call

```solidity
vault = Clones.clone(implementation);          // deployed…
// …six comment lines…
vault = address(new TideVault(...));           // …and immediately overwritten
```

Every `createVault` deployed an EIP-1167 proxy, discarded the reference, and
then paid full deployment cost for a fresh vault. Users paid for both.

**Fixed.** Real clone deployment via `cloneDeterministic`, with an initializer,
`_disableInitializers()` on the implementation, and a `predictVaultAddress`
view. `test_Clone_IsFarCheaperThanFullDeployment` asserts the saving.

### 5. First-depositor inflation attack

The vault used OpenZeppelin's `ERC4626` with the default `_decimalsOffset()` of
zero and no virtual shares, leaving the standard donation/inflation attack open
against the first depositor.

**Fixed.** Not applicable — share accounting is gone entirely.

### 6. Documentation described a system that did not exist

`README.md` and `docs/architecture.md` referenced `docs/wiring.md`,
`docs/contracts.md`, `docs/data-sources.md`, `docs/deployment.md` and
`docs/design.md`. **None of them existed.** The docs also described an Envio /
Ponder / Goldsky indexer, a Supabase mirror, an Upstash cache, Vercel Cron,
`src/lib/indexerFallback.ts`, `pnpm test` (vitest) and Playwright E2E. None of
these were implemented; several of the packages were not even dependencies.

**Fixed.** Every document referenced now exists, and every claim in them maps to
code in this repository.

---

## Medium

### 7. Three different chain IDs, none of them correct

| Location | Value | Reality |
|---|---|---|
| `lib/wagmi.ts`, `.env.example` | `97468` | Does not exist |
| `app/app/page.tsx` (twice) | `31337` | Anvil's default |
| landing page badge | `46630` | Correct for **testnet** |

Robinhood Chain is **4663** (mainnet) and **46630** (testnet). The RPC fell back
to `sepolia-rollup.arbitrum.io` and the explorer to `sepolia.arbiscan.io` — a
different network entirely.

**Fixed.** One definition in `lib/chains.ts`, and
`honesty.spec.ts › only one chain identity is presented anywhere` fails the build
if a stray ID reappears.

### 8. The wrong stablecoin, the wrong oracle, the wrong ticker

- The protocol assumed **USDC**. Robinhood Chain has no canonical Circle USDC;
  its stablecoin is **USDG** (Paxos, 6 decimals,
  `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`). Tokens named "USD Coin" on that
  explorer are impostors with 18 decimals.
- The price route called **Pyth Hermes**. Pyth is not deployed on Robinhood
  Chain at all. **Chainlink** is the chain's official oracle partner, with live
  feeds for the tokenized equities.
- Assets were labelled `AAPL.x`, `NVDA.x`, `SPY.x`. The real tokens use the
  plain ticker, 18 decimals, plus an ERC-8056 `uiMultiplier()`.

**Fixed.** See [data-sources.md](data-sources.md) for every address, with its
source.

### 9. Buttons that were `alert()` calls

```javascript
const onDeposit = () => {
  alert("Deposit requires a vault — create vault first via Factory.createVault()...");
};
const onWithdraw = () => {
  alert("Withdraw requires vault shares — create vault + deposit first...");
};
```

Deposit and Withdraw — two of the four actions in the advertised closed loop —
were browser alerts explaining what the code would have done.

**Fixed.** Both are wired, with approval handling, simulation, the full
transaction lifecycle, and a real receipt.

### 10. Fabricated data presented as live

The landing page's "LIVE VAULT • WIRED" card displayed `$1,000.00` deposited,
`5d 03h` to next execution, `+99.85 AAPL.x @ $182.40`, and a transaction hash
`0xe29b274a…` linking to Arbitrum Sepolia. Its own footer read:

> "Not a mock — reads totalAssets() + Executed events via indexer. If this card
> shows 0, it's honest."

There was no indexer and no contract call anywhere on that page. The dashboard
carried hardcoded `0 vaults · 0 executions`, a `Next in 5d 03h` countdown, a
`● INDEXER • REAL EVENTS` live indicator, and a decorative row of state pills
(`Loading / Empty / Populated / Stale / Error`) rendered as if they were UI.

The page also claimed `6/6 forge tests` while the README claimed 7 — the real
count was 7 — and asserted `coverage 50.4%` with no coverage tooling configured.

**Fixed.** No figure appears in the interface that is not read from the chain or
a compiled-in protocol constant. `honesty.spec.ts` asserts each of these
specific strings can never return.

---

## Low

| | |
|---|---|
| 11 | `next.config.ts` set `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`; `tsconfig.json` set `"strict": false`; `providers.tsx` was `// @ts-nocheck`. All removed — the build now typechecks and lints. |
| 12 | `new Date().toLocaleTimeString()` rendered directly in JSX, guaranteeing a hydration mismatch on every load. Clocks now start after mount. |
| 13 | Indonesian text leaked into the English UI: *"dot kuning + 'Price delayed'"*. |
| 14 | `setInterval` was shadowed by a React state variable named `interval` in the dashboard. |
| 15 | Three font families loaded via `@import url(fonts.googleapis.com)` inside CSS, blocking first paint on a third-party round trip. Now two variable faces, vendored and self-hosted. |
| 16 | `TOKENS` in `lib/config.ts` gave all three assets the same address and `pythId: "0x..."`. |
| 17 | The `Executed` event's `executionPrice` mixed 6- and 18-decimal quantities, so the logged price was in no consistent unit. Now a documented 1e8 scale, matching Chainlink. |
| 18 | `setInterval` on a plan never reset `nextExecution`, so shortening an interval could make a plan retroactively executable. |
| 19 | `execute` used `revert ZeroAmount()` for an insufficient-balance condition. |
| 20 | `contracts/README.md` was the unmodified Foundry template, still referencing `Counter.s.sol`. |

---

## Verification

```bash
cd contracts && forge test          # 54 tests: unit, fuzz, invariant, security
cd frontend  && pnpm test           # 35 unit tests
cd frontend  && pnpm e2e            # closed loop + honesty + responsive/a11y
```

The closed-loop E2E runs against a live Anvil devnet with the real contracts
deployed. Nothing in it is mocked except the wallet chooser.
