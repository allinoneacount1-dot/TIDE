<div align="center">
  <img src="frontend/public/wordmark.svg" alt="TIDE" width="320" />
  <p><strong>Recurring execution for tokenized equities on Robinhood Chain.</strong></p>
</div>

---

You set the interval, the size, and the highest price you will pay. A vault you own
holds the capital, executes on schedule, and refuses any fill outside your guard.

Non-custodial. No protocol token. Every execution verifiable on chain.

```
Connect → Create vault → Deposit → Configure a plan → Execute
        → Indexed → Portfolio updates → Withdraw
```

That loop is covered end to end by an automated test that runs against a real
chain. See [Testing](#testing).

---

## Contents

| | |
|---|---|
| [Quick start](#quick-start) | Get a devnet running in four commands |
| [How it works](#how-it-works) | The model, and what guards an execution |
| [Repository layout](#repository-layout) | Where things live |
| [Deployment](docs/deployment.md) | Robinhood Chain mainnet and testnet |
| [Architecture](docs/architecture.md) | Contracts, frontend, keeper, data flow |
| [Wiring map](docs/wiring.md) | Every UI action → its path to the chain |
| [Contracts](docs/contracts.md) | Storage, events, invariants, threat model |
| [Design system](docs/design-system.md) | Tokens, motion, component grammar |
| [Data sources](docs/data-sources.md) | Every external service, with real free-tier limits |
| [Security](docs/security.md) | Trust model and what a compromise buys an attacker |
| [Testing](docs/testing.md) | What is covered and how to run it |
| [Troubleshooting](docs/troubleshooting.md) | Symptoms and causes |
| [Audit](docs/AUDIT.md) | What the previous build got wrong, and what changed |

---

## Quick start

Requires Node 20+, pnpm, and [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
# 1. contracts
cd contracts
forge install
forge test

# 2. a local chain with a full simulated market
anvil --chain-id 46630 --block-time 1 &
forge script script/DeploySimulated.s.sol:DeploySimulated \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 3. frontend
cd ../frontend
pnpm install
cp .env.example .env.local     # then set the two devnet lines below
pnpm dev                       # http://localhost:3000

# 4. the keeper (optional — you can also execute by hand in the UI)
cd ../keeper
npm install
cp .env.example .env
npm run dry                    # one pass, no transactions
```

For the devnet, `frontend/.env.local` needs only:

```bash
NEXT_PUBLIC_DEFAULT_CHAIN_ID=46630
NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL=http://127.0.0.1:8545
```

The deploy script writes `contracts/deployments/46630.json`, and
`pnpm predev` copies it into the frontend automatically — there is no address to
paste anywhere.

---

## How it works

**A vault** is a contract you own, deployed as an EIP-1167 clone. It holds quote
capital. Only you can withdraw from it, in every state the protocol can be in.

**A plan** lives inside a vault: buy this asset, this much, this often, never
above this price. You can pause, edit or retire it at any time.

**A keeper** may call `execute` when a plan's window opens. That is its entire
authority — it cannot withdraw, cannot alter a plan, cannot retarget a vault.

### What guards an execution

Every execution must clear a floor computed on chain, and the floor is the
tighter of two independent constraints:

- **Your limit price** — the most you will pay, stored on the plan.
- **The oracle band** — the registry's Chainlink feed for that asset, less your
  slippage tolerance.

The keeper supplies its own `minOut` from the live route, but the contract takes
whichever floor is higher. **A keeper passing `minOut = 0` still cannot execute
below your guard.** A plan with neither a limit price nor a feed is never
executable — it reports `Unguarded` rather than trading blind.

Output is measured as the vault's balance delta across the swap, so a router
that reports one number and delivers another is caught by arithmetic rather
than by trust.

### What the contract will not do

| Refusal | Mechanism |
|---|---|
| Move your assets | Only the owner can call `withdraw` / `exitAll` |
| Execute without a price floor | `Unguarded` readiness blocks it |
| Let a keeper accept a bad fill | `minOut` may only tighten the on-chain floor |
| Leave an allowance standing | Approve exact, revoke in the same call |
| Overcharge | Fee clamped locally against a compiled-in `MAX_FEE_BPS = 50` |
| Trap you | Withdrawal works while paused, halted, and with a dead oracle |
| Strand what it bought | Every asset is withdrawable by address |

---

## Repository layout

```
contracts/       Foundry. TideRegistry + TideVault, mocks, deploy scripts.
  src/           The protocol.
  test/          54 tests: unit, fuzz, invariant, and a security suite of
                 attacks the previous design permitted.
  script/        Deploy for mainnet (real market) and simulated (devnet/testnet).
frontend/        Next.js 15, wagmi 2, viem 2, GSAP, TradingView charts.
  src/lib/       Chain config, ABI generation, formatting, indexer.
  src/hooks/     Contract reads and the transaction lifecycle.
  src/components/ Design system, motion system, app surfaces.
  tests/         Unit (vitest) and end-to-end (Playwright, real chain).
keeper/          The execution keeper. Stateless, runnable anywhere.
docs/            Everything above.
```

---

## A note on honesty

This repository previously described an architecture it did not have: an
indexer that was never written, a test count that did not match, three
conflicting chain IDs, and a landing page presenting invented balances and a
fabricated transaction hash as live data.

That is fixed, and there are automated tests that fail if it comes back —
`frontend/tests/e2e/honesty.spec.ts` asserts on the *absence* of fabricated
figures and placeholder controls. Where TIDE cannot prove something, it says so:
the testnet market is labelled **simulated** on every screen that shows it,
because Robinhood Chain testnet has no official stock tokens, no DEX aggregator
and no price feeds.

---

## Licence

MIT.
