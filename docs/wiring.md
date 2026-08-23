# Wiring map

Every action in the interface, and its actual path to the chain. If a row here
cannot be traced end to end in the code, it is a bug.

Legend: **UI** → **logic** → **chain/service** → **confirmation** → **refresh**

---

## Landing (`/`)

| Element | Wired to |
|---|---|
| Cycle diagram | Nothing. It is a labelled model of the protocol, and contains no figures |
| Fact strip | `PROTOCOL.maxFeeBps`, a compiled-in constant mirrored from `TideVault.MAX_FEE_BPS` |
| Status section | `getDeployment()` — the registry address and simulated flag from the deployment record written by the deploy script |
| Launch / nav | Routes |

No balance, price, count or transaction hash appears on this page. There is
nothing here TIDE could not prove.

---

## Terminal (`/app`)

### Reads

| Surface | Source | Cadence |
|---|---|---|
| Vault list | `TideRegistry.getUserVaults(address)` | 60s |
| Vault core | `owner`, `quote`, `quoteDecimals`, `keeper`, `paused`, `idleCapital`, `getPlans` — batched | 12s |
| Readiness | `TideVault.canExecute(planId)` per plan | 10s |
| Execution floor | `TideVault.requiredOutFor(planId)` per plan | 8s |
| Exposure | `TideVault.exposure()` | 12s |
| History | `/api/executions` → Blockscout, RPC fallback | 30s |
| Protocol config | `feeBps`, `treasury`, `defaultKeeper`, `maxOracleAge`, `executionsHalted`, `MAX_FEE_BPS` | 60s |
| Token metadata | `symbol`, `name`, `decimals` | once, cached forever |
| Reference price | The `referencePrice` returned by `canExecute` | with readiness |

Polling intervals track volatility. Readiness changes without anyone acting — a
window opens, an oracle goes stale — so it polls fastest. Token decimals never
change, so they are fetched once.

### Writes

| Action | Path |
|---|---|
| **Create vault** | Button → `useTideTx.send` → simulate → `TideRegistry.createVault(quote)` → receipt → refetch vault list |
| **Deposit** | Amount → `parseUnitsSafe` → allowance check → `ERC20.approve` if short → `TideVault.deposit(amount)` → receipt → refetch vault |
| **Withdraw one** | Asset + amount → `TideVault.withdraw(token, amount, to)` → receipt → refetch vault + exposure |
| **Withdraw all** | `TideVault.exitAll(to)` → receipt → refetch |
| **Create plan** | Form → validated against contract bounds → `TideVault.createPlan(...)` → receipt → refetch |
| **Pause / resume plan** | `TideVault.setPlanActive(planId, bool)` → receipt → refetch |
| **Pause / unpause vault** | `TideVault.pause()` / `unpause()` → receipt → refetch |
| **Execute** | Readiness check → route quote → `requiredOutFor` → floor comparison → `TideVault.execute(planId, minOut, router, spender, swapData)` → receipt → refetch all |

Every write runs through `useTideTx`, which simulates before opening the wallet.
A plan that is not due, a router that is not allowlisted, an allowance that is
short — all surface as readable copy *before* a signature, not as a failed
transaction the user paid for.

### Route resolution

| Chain | Source |
|---|---|
| Simulated (devnet, testnet 46630) | `MockRouter.swap` calldata encoded client-side; expected output from an `eth_call` to `quoteOut` on the deployed router |
| Mainnet 4663 | `/api/quote` → 0x Swap API v2 → `transaction.to`, `transaction.data`, `issues.allowance.spender` |

Either way the vault re-derives its own floor on chain and measures output as a
balance delta, so a wrong or hostile quote costs a reverted transaction, never
capital.

---

## States

Every data surface implements the full set. There is no path that renders a
spinner forever or a bare zero.

| State | Where it comes from | What is shown |
|---|---|---|
| Loading | React Query `isLoading` | A skeleton with the same dimensions as the content, so nothing shifts |
| Empty | Successful read, no rows | What would put something here, and the action that does it |
| Populated | Data | The data |
| Stale | `Readiness.OracleStale` | "Awaiting market", with the 24/5 explanation |
| Partial | `ExecutionPage.partial` | The exact coverage: "last 50,000 blocks. Older executions are not shown" |
| Unavailable | `source: "none"` | "Neither the indexer nor the node responded" |
| Error | Query error / revert | The decoded reason, mapped to an action |
| Unconfigured | `getDeployment()` returns undefined | "No registry on this network" — and nothing pretends to read |

---

## Transaction lifecycle

```
idle → wallet-required? → wrong-network? → simulating
     → awaiting-signature → submitted → pending → confirmed
                                              ↘ reverted
     ↘ rejected   ↘ rpc-error   ↘ timeout
```

Rendered in the session-wide tracker, which sits in one fixed place rather than
inline beside whichever button was pressed — a deposit takes seconds and the user
is likely to navigate while it settles.

- **`submitted` and `confirmed` are separate**, because a broadcast is not a
  success. Nothing reports success without a receipt whose status is `success`.
- **`reverted` is a failure even though it was mined**, and says gas was spent.
- **`rejected` is not an error.** Nothing was sent and nothing was spent.
- **`timeout` means unknown**, not failed. The transaction may still land, and it
  tells the user to check the explorer rather than retry blindly.
- Confirmed cards retire after seven seconds. Failures stay until dismissed.

---

## Provenance

Every address the session trusts is listed in the terminal's provenance band with
an explorer link: vault, owner, keeper, registry, quote asset, router — plus the
live fee, its compiled ceiling, and the oracle freshness window. Anyone can
verify the vault they are using is a clone of the implementation the registry
declares.
