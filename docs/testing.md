# Testing

```bash
cd contracts && forge test        # 54 tests
cd frontend  && pnpm test         # 35 tests
cd frontend  && pnpm e2e          # 15 tests, against a live chain
```

---

## Contracts — 54 tests

| Suite | | |
|---|---|---|
| `TideVault.t.sol` | 17 | The closed loop, economics, cadence, readiness, plan lifecycle |
| `TideVaultSecurity.t.sol` | 16 | Every attack the previous design permitted |
| `TideRegistry.t.sol` | 9 | Deployment determinism, access control, enumeration |
| `PriceMath.t.sol` | 7 | Decimal correctness, fuzzed round-trip and monotonicity |
| `TideVault.invariants.t.sol` | 5 | 128 runs × 32 calls each |

### The security suite

Each test corresponds to a finding in [AUDIT.md](AUDIT.md):

| | |
|---|---|
| `test_Keeper_CannotWeakenSlippageFloor` | `minOut = 0` against a router quoting 40% below the oracle |
| `test_Keeper_CannotExecuteAboveOwnerLimitPrice` | Limit price alone, no feed, market above the limit |
| `test_Keeper_CannotUseUnapprovedRouter` | Route to a contract not on the allowlist |
| `test_Keeper_CannotApproveUnallowlistedSpender` | 0x-style split router/spender abuse |
| `test_Keeper_HasNoAuthorityOverFunds` | Every owner-only function, called by the keeper |
| `test_Router_TakingCapitalAndReturningNothing_Reverts` | Theft. Asserts capital is intact after |
| `test_Router_CannotPullMoreThanTheCycleAmount` | Allowance drain attempt |
| `test_Router_CannotReenter` | Re-entrant `execute` from inside the swap |
| `test_Vault_ClampsFee_EvenIfRegistryReports100Percent` | Hostile registry reporting a 100% fee |
| `test_ProtocolHalt_StopsExecutionButNeverTheExit` | Halt, then withdraw |
| `test_Paused_StopsDepositsAndExecutionButNeverTheExit` | Pause, then withdraw |
| `test_Oracle_NegativeOrZeroAnswer_IsTreatedAsStale` | Invalid answers |
| `test_Oracle_RevertingFeed_DoesNotBrickTheVault` | Feed reverts; reads still answer, exit still works |
| `test_Oracle_QuoteDepeg_TightensTheFloor` | USDG at $0.90 demands ~10% fewer shares |

### Invariants

Verified against a handler driving deposits, plan creation, execution,
withdrawal, pausing and router slippage in arbitrary order.

The important one is `invariant_OwnerCanAlwaysExit`: from a snapshot in every
reachable state, `exitAll` succeeds and leaves the vault empty.

---

## Frontend units — 35 tests

`format.test.ts` covers the money path. These are the tests that matter most in
a financial UI, so they assert on exactness rather than appearance:

- Values beyond `Number.MAX_SAFE_INTEGER` format without loss
- 18-decimal values keep every digit
- Truncation, never rounding, so a balance is never overstated
- `undefined` renders `—` while `0n` renders `0.00` — they mean different things
- Parsing rejects `1e18`, `0x10`, `-5`, and more decimals than the token has

`lifecycle.test.ts` covers transaction semantics:

- A declined signature is `rejected`, tone `neutral` — not a failure
- A timeout is `timeout`, not `reverted` — the transaction may still land
- `submitted` and `confirmed` are distinct phases, in that order
- Every `Readiness` enum member has copy, and an unknown code degrades safely
- No readiness message ever claims withdrawal is blocked

---

## End to end — against a live chain

Playwright drives a browser against a real Anvil devnet with the real contracts
deployed. Nothing is mocked except the wallet chooser, via wagmi's mock connector
bound to a devnet account — automating a browser extension would test the
extension, not TIDE.

### `closed-loop.spec.ts`

The full journey, in one test:

```
connect → create vault → deposit → configure a plan → execute
        → indexed → UI updates → withdraw everything
```

It asserts on state the chain produced: idle capital reflects the deposit, the
plan's readiness comes from `canExecute`, the execute review shows the on-chain
floor before any signature, and a ledger row appears with a transaction hash.

### `honesty.spec.ts`

Asserts on the **absence** of invention, and fails if the previous build's
specific fabrications return: `$1,000.00`, `99.85 AAPL`, `182.40`, a test-count
claim, a coverage claim, chain IDs `97468` or `31337`, marketing phrases from the
brief's exclusion list, and any control labelled "coming soon" or "TBD".

### `responsive.spec.ts`

At Pixel 7 width, for every route:

- The page never scrolls horizontally
- One `h1`, no skipped heading levels
- Every interactive target meets WCAG 2.2 AA's 24px minimum
- Every icon is labelled or explicitly `aria-hidden`
- Keyboard focus is visible

### Running them

```bash
# terminal 1
anvil --chain-id 46630 --block-time 1

# terminal 2
cd contracts && forge script script/DeploySimulated.s.sol:DeploySimulated \
  --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974...ff80

# terminal 3
cd frontend
cat >> .env.local <<'EOF'
NEXT_PUBLIC_E2E=1
NEXT_PUBLIC_E2E_ACCOUNT=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
EOF
pnpm dev

# terminal 4
cd frontend && pnpm e2e
```

Fund the E2E account with mock USDG first — see [development.md](development.md).

`NEXT_PUBLIC_E2E` is read at module scope, so a production build with the flag
unset cannot reach the mock connector at all.

---

## What is not covered

Stated rather than omitted:

- No fork tests against mainnet 4663. Adding them requires an archive RPC.
- No coverage threshold is enforced. The previous build advertised "50.4%" with
  no coverage tooling configured; rather than repeat that, no figure is claimed.
- No visual regression testing.
- The real 0x route path is exercised by unit-level validation only — testnet has
  no aggregator, so there is nowhere to integration-test it below mainnet.
