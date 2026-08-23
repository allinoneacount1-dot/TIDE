# TIDE — Capital, on tide.
> Recurring Execution Protocol for Robinhood L2 / Ethereum

**One-line:** Automated recurring investing for tokenized stocks on Robinhood L2. Verifiable on-chain.

---

## Quick Start

```bash
# Contracts
cd contracts
forge build
forge test -vv

# Frontend (requires Node 20+)
cd frontend
# pnpm install needs ~2GB heap — on constrained VM use:
NODE_OPTIONS="--max-old-space-size=4096" pnpm install
pnpm dev # http://localhost:3000

# Env
cp .env.example .env
```

---

## Architecture

```
User → Frontend (Next.js + wagmi + RainbowKit)
     → Wallet (EOA) → chain validation (Robinhood L2)
     → RPC (Alchemy primary, Infura fallback)
     → Contracts (VaultFactory + TideVault ERC4626)
     → DEX Aggregator (0x) + Oracle (Pyth)
     → Indexer (Envio/Goldsky or getLogs fallback)
     → Supabase (mirror)
     → UI (TanStack Query)
```

---

## Contracts

- `TideVault.sol` — ERC4626 vault, `execute()` onlyKeeperOrOwner, slippage guard, fee 0.15%
- `VaultFactory.sol` — deploys vaults, tracks `userVaults`
- Tests: `forge test` — 7 tests, all pass

Deploy:
```bash
forge script script/Deploy.s.sol --rpc-url $ROBINHOOD_L2_RPC --broadcast
```

---

## Frontend Wiring

Every button → real handler → real RPC/contract call → real state. No dummy data.

See `docs/wiring.md` for full UI→Logic→DataSource→Contract→DB→UI map.

---

## Design

Robinhood Machine Editorial: graphite base `#0A0B0A`, acid green `#CCFF00` as signal only, Swiss grid, mono for amounts.

See `docs/design.md`.

---

## Docs

- `docs/architecture.md` — full stack
- `docs/wiring.md` — feature matrix
- `docs/contracts.md` — storage, events, threat model
- `docs/data-sources.md` — free-tier matrix
- `docs/deployment.md` — testnet → mainnet
- `.env.example` — all env vars

---

## Definition of Done

Closed loop `Connect → Create Vault → Deposit → Execute ( keeper tx ) → Indexed → Portfolio Update → Withdraw` must pass E2E before launch.
