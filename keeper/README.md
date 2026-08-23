# TIDE Keeper

The process that calls `execute()` when a plan's window opens.

## Why this exists

TIDE cannot outsource this. Verified against both providers' own supported-network
lists as of August 2026:

- **Chainlink Automation** does not support Robinhood Chain (4663 or 46630).
- **Gelato Web3 Functions** does not support Robinhood Chain.

There is no managed keeper for this chain. So TIDE ships one — a single stateless
script that can run from GitHub Actions, a $5 VPS, or your laptop.

## What it can and cannot do

The keeper's entire authority is calling `execute(planId, minOut, router, spender, swapData)`
on vaults that have named it. It **cannot** withdraw, cannot change a plan, cannot
retarget a vault, and cannot execute below the vault's on-chain price floor — the
contract recomputes that floor itself and takes the tighter of the keeper's `minOut`
and its own.

That matters for how you run it: a leaked keeper key is a denial-of-service and a
gas bill, not a loss of funds.

## Setup

```bash
cd keeper
npm install
cp .env.example .env    # then edit
npm run dry             # one pass, no transactions
npm run once            # one pass, sends transactions
npm start               # continuous
```

### Environment

| Variable | Required | Meaning |
|---|---|---|
| `RPC_URL` | yes | Robinhood Chain RPC endpoint |
| `KEEPER_PRIVATE_KEY` | yes | Hot key. Fund with a small ETH balance for gas, nothing else |
| `REGISTRY_ADDRESS` | yes | TideRegistry address for the chain |
| `CHAIN_ID` | yes | `4663`, `46630`, or `31337` for a local devnet |
| `ZEROX_API_KEY` | on mainnet | Required to fetch swap routes from 0x |
| `POLL_SECONDS` | no | Default `60` |
| `MAX_GAS_GWEI` | no | Skip a cycle if gas exceeds this. Default `5` |
| `VAULTS` | no | Comma-separated allowlist. Default: every vault in the registry |

## Running it on GitHub Actions

`.github/workflows/keeper.yml` runs a single pass on a schedule. Scheduled
workflows on public repositories have no minute cap, but GitHub delays them under
load — commonly 5–20 minutes. For weekly or daily cadences that drift is
irrelevant. For hourly plans, run it on a VPS instead.

**Do not** put the keeper key in a plain repository variable. Use an Actions
secret, and use a key that holds gas and nothing else.

## Running it on a VPS

```bash
npm start
```

Or as a systemd unit — see `keeper.service.example`.
