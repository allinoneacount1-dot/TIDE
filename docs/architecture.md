# TIDE Documentation

## Architecture

See README.md for diagram. Full wiring in `docs/wiring.md`.

## Data Sources

| Info | Primary | Fallback | Cache |
|------|---------|----------|-------|
| USDC balance | RPC eth_call | Indexer | 15s |
| Vault shares | contract convertToAssets | — | 30s |
| Executions | Indexer Executed events | getLogs | DB 60s |
| Price | Pyth Hermes (free) | Chainlink | Redis 30s |
| Quote | 0x API (free) | RPC quote | 15s |

All data-driven components have: loading / empty / populated / stale / unavailable / error / rate-limited.

## Contracts

- `TideVault.sol`: ERC4626, pausable, reentrancy guarded, onlyKeeperOrOwner execute, slippage minOut, fee 15bps
- `VaultFactory.sol`: clone deploy, treasury, userVaults mapping

Events: VaultCreated, Deposited, Executed(amountIn, amountOut, price, timestamp, executionId), Withdrawn

Security: OZ 5.3, no upgradeability (MVP immutable), allowlist aggregator, Tenderly simulation pre-broadcast.

## Deployment

### Local

```bash
anvil # fork
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974...
```

### Testnet (Robinhood / Arbitrum Sepolia)

```bash
forge script script/Deploy.s.sol --rpc-url $ROBINHOOD_L2_RPC --broadcast --verify
```

Set `.env` with addresses.

## Indexer

Option A (free self-host): Ponder + Supabase
Option B (managed free): Envio — config in `indexer/envio.config.ts`
Option C (MVP no-indexer): `getLogs` polling via `src/lib/indexerFallback.ts` + Vercel Cron every 60s

## Free-tier matrix

See README; total MVP $0-5/mo.

## Testing

- `forge test -vv` (contracts)
- `pnpm test` (frontend vitest)
- `pnpm exec playwright test` (E2E: Connect→Create→Deposit→Execute→Withdraw)

## Security notes

- Never expose PRIVATE_KEY or API secrets with NEXT_PUBLIC prefix
- `grep -r NEXT_PUBLIC.*API_KEY frontend/src` must be empty
- Keeper is allowlisted; owner can rotate
- Pausable for emergency
