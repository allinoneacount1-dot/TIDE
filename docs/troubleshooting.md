# Troubleshooting

## The terminal says "No deployment on this network"

`getDeployment()` found no registry for the connected chain.

```bash
# is there a deployment record?
ls contracts/deployments/

# did the frontend pick it up?
cd frontend && pnpm sync:contracts
```

For a hosted build, set `NEXT_PUBLIC_TIDE_REGISTRY_<chainId>` instead.

---

## A plan will not execute

Read the readiness label — the contract states the reason and the interface shows
it verbatim.

| Label | Cause | Fix |
|---|---|---|
| **Armed** | Window has not opened | Nothing. Wait |
| **Underfunded** | Idle balance below one cycle | Deposit |
| **Awaiting market** | Chainlink answer older than the freshness window | Nothing. Equity feeds are 24/5; it resumes at the open |
| **No price guard** | No registry feed and no limit price | Set a limit price on the plan |
| **Vault paused** | You paused it | Unpause |
| **Protocol halted** | Registry-level stop | Nothing. Withdrawal still works |
| **Paused** | You disarmed the plan | Resume |
| **Complete** | `cyclesTotal` reached | Create a new plan |

From the command line:

```bash
cast call $VAULT "canExecute(uint256)(bool,uint8,uint256)" 0 --rpc-url $RPC
```

The second value is the readiness code — see [contracts.md](contracts.md).

---

## "Route is below your floor"

The venue is quoting less than the contract will accept, so the transaction would
revert and only cost gas. Either:

- Wait for the price to come back inside your guard, or
- Raise the plan's limit price, or
- Widen the slippage tolerance (it is capped at 10%)

This is the guard working. It is the difference between a skipped cycle and a bad
fill.

---

## "No route available"

| Detail | Meaning |
|---|---|
| `no_aggregator` | 0x has no coverage on this chain. Testnet 46630 has no aggregator at all — use a simulated deployment |
| `not_configured` | `ZEROX_API_KEY` is not set on the server |
| `no_liquidity` | 0x found no route for this pair and size. Try a smaller cycle |
| `unreachable` | The aggregator did not respond. Retry |

---

## Execution history is empty or says "Direct node scan"

The Blockscout proxy failed and the app fell back to a bounded RPC scan.

```bash
curl "http://localhost:3000/api/executions?vault=0x...&chainId=46630"
```

On a local devnet there is no Blockscout, so the RPC path is expected — and
because the devnet starts at block 0, that scan is complete and the interface
says so rather than labelling it partial.

---

## Deposit asks for two signatures

Your allowance to the vault is below the deposit amount, so it approves first.
The drawer says so before you start. Tick "approve an unlimited amount" to make
future deposits one signature — at the cost of a standing allowance.

---

## The transaction says "Timed out"

No receipt arrived inside the wait window. **This does not mean it failed.** Check
the explorer link before retrying — resubmitting a transaction that actually
landed will execute the cycle twice.

---

## The TradingView panel does not load

The market chart is a third-party embed. If a network or content blocker stops
it, the panel says so and states that vault data below is unaffected — that data
is read directly from the chain.

---

## Hydration mismatch in development

Should not happen; all clocks start after mount. If you see one, look for
`Date.now()` or `Math.random()` in a component body rather than an effect.

---

## `forge build` cannot download solc

```bash
# check submodules first
cd contracts && forge install

# in a restricted network, point at a local solc
forge build --use /path/to/solc-0.8.28
```

---

## `pnpm install` runs out of memory

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm install
```

---

## The keeper sees no vaults

```bash
cd keeper && npm run dry
```

| Output | Cause |
|---|---|
| `scanning 0 vaults` | Wrong `REGISTRY_ADDRESS`, or none created yet |
| Vaults scanned, none processed | The vault's keeper is not your signer. Check `cast call $VAULT "keeper()(address)"` |
| `no ETH for gas` | Fund the keeper address |
| `gas is X gwei, above MAX_GAS_GWEI` | Raise `MAX_GAS_GWEI` or wait |

---

## The E2E suite cannot connect a wallet

`NEXT_PUBLIC_E2E=1` and `NEXT_PUBLIC_E2E_ACCOUNT` must be set **before** the dev
server starts — they are inlined at build time. Restart it after editing
`.env.local`.
