# Architecture

```
                    ┌───────────────────────────────────────────┐
   browser          │  Next.js 15 · App Router                  │
                    │                                           │
                    │  /            marketing, no wallet code   │
                    │  /docs        reference, no wallet code   │
                    │  /app         terminal — wagmi + viem     │
                    └───────────────┬───────────────────────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              │                     │                      │
     reads / writes          route handlers          indexed history
              │                     │                      │
              ▼                     ▼                      ▼
      ┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
      │  JSON-RPC     │   │ /api/quote  (0x) │   │ /api/executions  │
      │  Robinhood    │   │ /api/price       │   │ → Blockscout     │
      │  Chain        │   │   (Chainlink)    │   │   (RPC fallback) │
      └───────┬───────┘   └──────────────────┘   └──────────────────┘
              │
              ▼
      ┌──────────────────────────────────────────────────────┐
      │  TideRegistry            (one per chain)             │
      │    · router allowlist  · price feeds  · fee          │
      │    · treasury  · keeper  · halt  · vault enumeration │
      └───────────────┬──────────────────────────────────────┘
                      │ clones (EIP-1167)
                      ▼
      ┌──────────────────────────────────────────────────────┐
      │  TideVault               (one per user, per quote)   │
      │    · idle quote capital  · acquired assets           │
      │    · Plan[]  · execute() · withdraw() · exitAll()    │
      └───────────────▲──────────────────────────────────────┘
                      │ execute(planId, minOut, router, spender, data)
                      │
      ┌───────────────┴──────────┐
      │  keeper/  (self-hosted)  │  GitHub Actions · VPS · local
      └──────────────────────────┘
```

## Why it is shaped this way

**One vault per user, not a shared pool.** Isolation is the product: a bug or a
hostile route in one vault cannot touch another, and there is no shared share
price to manipulate. EIP-1167 clones make the per-user cost a fraction of a full
deployment.

**Configuration in the registry, capital in the vault.** The registry holds the
things that must be changeable in an incident — which routers may be called,
which feed guards which asset, whether executions are halted. It holds no
capital and has no path to any. A fully compromised registry owner can stop
executions and redirect the fee, both bounded; they cannot reach principal.

**The keeper is a triggering device, not an operator.** Its only authority is
`execute` on vaults that have named it, inside guards the vault recomputes. This
is what makes a self-hosted keeper acceptable on a chain that has no managed
automation.

**Route handlers exist for secrets and for shape, not for convenience.**
`/api/quote` holds the 0x key server-side and works around 0x's CORS behaviour.
`/api/executions` proxies Blockscout so the browser is not depending on the
explorer's CORS policy, and so repeated views cost the explorer one request.
`/api/price` reads the same Chainlink aggregator the on-chain guard consults.

## Data flow for one execution

1. The keeper (or the owner, in the UI) reads `canExecute(planId)`. It returns a
   readiness code and the oracle reference price.
2. If ready, a route is fetched — 0x on mainnet, the deployed simulated router
   on a simulated chain.
3. `requiredOutFor(planId)` is read. If the route is below it, the execution is
   skipped rather than broadcast: a revert costs gas for nothing.
4. `execute(planId, minOut, router, spender, swapData)` is simulated, then sent.
5. The vault charges the fee, approves the exact remaining amount, calls the
   router, revokes the approval, measures the balance delta, checks it against
   the floor, advances the cadence and emits `Executed`.
6. The frontend re-reads vault state and refetches history. The `Executed` event
   is what populates the ledger and the cost-basis chart.

## Frontend structure

| Path | Responsibility |
|---|---|
| `src/lib/chains.ts` | The only place a chain ID or RPC is defined |
| `src/lib/abi.generated.ts` | Generated from Foundry artifacts by `pnpm sync:contracts` |
| `src/lib/deployments.generated.ts` | Generated from `contracts/deployments/*.json` |
| `src/lib/format.ts` | All money formatting. bigint in, string out, no floats |
| `src/lib/lifecycle.ts` | Transaction phases and revert decoding |
| `src/lib/readiness.ts` | Mirrors `TideVault.Readiness` with copy per code |
| `src/lib/indexer.ts` | Execution history, with source and coverage reported |
| `src/hooks/useTide.ts` | Contract reads, batched and polled by volatility |
| `src/hooks/useTideTx.ts` | Simulate → sign → submit → receipt |
| `src/components/motion/` | GSAP scenes, scoped and reverted per component |
| `src/components/tide/` | The signature objects: the tide line, the cycle |

ABIs and deployment records are **generated, never hand-written**. `pnpm predev`
and `pnpm prebuild` regenerate them, so a contract change that breaks a call site
is a build error rather than a runtime revert in front of a user.

## Chain characteristics that shaped decisions

Robinhood Chain is Arbitrum Nitro. Three properties changed the design:

- **~100ms blocks.** A month is roughly 26 million blocks, so `eth_getLogs` over
  any meaningful range is not viable. History comes from Blockscout, and the RPC
  fallback is bounded and labelled as partial.
- **`block.number` is an estimated L1 block number.** Nothing user-facing derives
  a time or a position from it; scheduling uses `block.timestamp` and the UI uses
  the RPC's L2 head.
- **Two-part gas (L2 execution + L1 calldata).** Swap calldata is the dominant
  cost of an execution, which is a reason to keep one execution to one plan.
