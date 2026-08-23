# Security

## Trust model

The question that matters is not "is this contract audited" but "what does
compromising each party actually get them". TIDE is designed so the answer is
bounded everywhere except the one place it cannot be: the vault owner's key.

| Role | Can | Cannot |
|---|---|---|
| **Vault owner** (you) | Everything: deposit, withdraw, create/edit/pause plans, execute, transfer ownership | — |
| **Keeper** | Call `execute` on vaults that named it, inside the vault's own guards | Withdraw. Alter a plan. Retarget a vault. Execute below the floor. Execute a paused vault |
| **Registry owner** | Change the router allowlist, price feeds, fee (≤0.50%), treasury, default keeper, oracle window; halt executions | Touch any vault's capital or holdings. Block withdrawal. Raise the fee past the compiled ceiling |
| **Router** | Receive an exact, single-cycle allowance during one call | Keep an allowance. Spend more than that cycle. Cause a fill below the floor to be accepted |

### A leaked keeper key

Denial of service and a gas bill. The keeper can trigger executions early only
if a window is genuinely open, and every one of them must clear the on-chain
floor. It cannot move value to itself. Rotate with `setKeeper`.

### A compromised registry owner

They can halt executions, point a plan's asset at a hostile router, or redirect
the fee. They cannot withdraw, and they cannot stop you withdrawing. The router
allowlist is the one setting worth watching, which is why it is a single
explicit mapping with its own event rather than a flag buried in a config
struct.

A hostile router still cannot take more than one cycle: the allowance is exact,
the spend is verified, and the output must clear the floor or the whole
transaction reverts.

### A dead or manipulated oracle

A stale or invalid answer produces `OracleStale` and blocks execution — it never
produces a bad price. Deposits and withdrawals are unaffected. If you would
rather not depend on the feed at all, set a limit price on the plan; it is
enforced independently.

---

## Specific properties

**Withdrawal is never gated.** Not by a vault pause, not by a protocol halt, not
by a dead oracle, not by a plan in any state. This is asserted as an invariant
across every state the fuzzer can reach.

**No standing allowances.** Approve exact, call, revoke — in one transaction.
Verified as an invariant.

**Fee is double-capped.** The registry rejects a fee above `MAX_FEE_BPS`, and the
vault clamps whatever the registry reports against its own compiled-in constant.
`test_Vault_ClampsFee_EvenIfRegistryReports100Percent` deploys a vault against a
registry that reports 100% and asserts 0.50% is charged.

**Two-step ownership.** On both the registry and every vault, so a mistyped
address cannot orphan a contract.

**No upgradeability.** No proxy admin, no implementation slot, no timelock to
trust. The vault implementation is immutable and `_disableInitializers()` makes
it unusable directly.

**Re-entrancy.** `nonReentrant` on every state-changing entry point, and the
router call sits inside the guard. `HostileRouter` exercises the path.

---

## Frontend and operational

**No secret is ever `NEXT_PUBLIC_`.** `NEXT_PUBLIC_*` values are inlined into the
client bundle. The 0x API key lives only in a route handler. Verify with:

```bash
grep -rn "NEXT_PUBLIC.*\(KEY\|SECRET\|TOKEN\|PRIVATE\)" frontend/src
```

That must return nothing.

**Route handlers validate before they fetch.** `/api/executions` and
`/api/price` build upstream URLs from caller-supplied addresses; both check
against `^0x[0-9a-fA-F]{40}$` first. Unvalidated, that is an SSRF primitive.

**Quotes are never cached.** `/api/quote` sets `no-store`. A cached swap route is
a failed transaction.

**Simulation before signature.** Every write is simulated against current chain
state, so a revert surfaces as readable copy before the wallet opens rather than
as a transaction the user paid for.

**Approvals default to exact.** Unlimited approval is offered, labelled as
leaving a standing allowance, and is opt-in.

---

## Known limitations

Stated rather than omitted.

- **Not audited.** No third-party review has been performed on this code.
- **The keeper is self-hosted.** Neither Chainlink Automation nor Gelato
  supports Robinhood Chain. If your keeper is down, plans do not execute — the
  window stays open and nothing is lost, but nothing happens either. You can
  always execute manually from the terminal.
- **Testnet is a simulated market.** Chain 46630 has no official stock tokens, no
  DEX aggregator and no Chainlink feeds. The contracts and transactions there are
  real; the market is mocks TIDE deployed, and every screen showing them says so.
- **Chainlink equity feeds are 24/5.** Executions will not fire outside market
  hours. This is intended, but it means a plan configured for a weekend window
  executes at the next open, not on time.
- **`uiMultiplier` is not yet applied.** Robinhood's stock tokens carry an
  ERC-8056 multiplier that grows with corporate actions, so token quantity is not
  share quantity over long periods. TIDE currently reports token quantities. The
  Chainlink feed price is already multiplier-adjusted, so prices are consistent;
  share-count display is the gap.

## Reporting

Open a GitHub security advisory rather than a public issue.
