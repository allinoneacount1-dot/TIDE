# Local development

## Requirements

| | |
|---|---|
| Node | 20+ |
| pnpm | 9+ |
| Foundry | any recent stable |

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

## Full loop from a clean checkout

```bash
git clone https://github.com/allinoneacount1-dot/TIDE.git && cd TIDE

# ── contracts ──────────────────────────────────────────────────────────────
cd contracts
forge install          # submodules: forge-std, openzeppelin-contracts
forge build
forge test

# ── a devnet with a complete simulated market ──────────────────────────────
anvil --chain-id 46630 --block-time 1 &

forge script script/DeploySimulated.s.sol:DeploySimulated \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# ── frontend ───────────────────────────────────────────────────────────────
cd ../frontend
pnpm install
printf 'NEXT_PUBLIC_DEFAULT_CHAIN_ID=46630\nNEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL=http://127.0.0.1:8545\n' > .env.local
pnpm dev
```

Anvil's first account is well known and funded. It is fine on a local devnet and
nowhere else.

`pnpm predev` regenerates ABIs from `contracts/out` and the address book from
`contracts/deployments`, so a contract change that breaks a call site fails the
build rather than reverting in front of a user.

## Giving yourself funds

The deploy script mints 1,000,000 USDG to the deployer. To fund another account:

```bash
export USDG=$(jq -r .quote contracts/deployments/46630.json)
cast send $USDG "mint(address,uint256)" $YOUR_ADDRESS 10000000000 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

10000000000 is 10,000 USDG — six decimals, like the real thing.

## Moving the simulated market

The mock router and feeds are settable, which is how you exercise slippage,
staleness and limit-price rejection without waiting for a real market.

```bash
export ROUTER=$(jq -r .router contracts/deployments/46630.json)
export AAPL_FEED=$(jq -r '.feeds[0]' contracts/deployments/46630.json)

# push the price to $250.00
cast send $ROUTER    "setPrice(uint256)" 25000000000 --rpc-url $RPC --private-key $PK
cast send $AAPL_FEED "setAnswer(int256)" 25000000000 --rpc-url $RPC --private-key $PK

# make the router quote 5% worse than the oracle, to trip the guard
cast send $ROUTER "setSlippageBps(uint16)" 500 --rpc-url $RPC --private-key $PK

# age the feed past the freshness window, to see OracleStale
cast send $AAPL_FEED "setAnswerStale(int256,uint256)" 18240000000 1 --rpc-url $RPC --private-key $PK
```

## Scripts

### `frontend`

| | |
|---|---|
| `pnpm dev` | Dev server. Regenerates ABIs first |
| `pnpm build` | Production build. Typechecks and lints |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests (vitest) |
| `pnpm e2e` | End-to-end (Playwright, against a live devnet) |
| `pnpm sync:contracts` | Regenerate ABIs and the address book |

### `contracts`

| | |
|---|---|
| `forge test` | Everything |
| `forge test --match-path "test/TideVaultSecurity.t.sol" -vv` | The attack suite |
| `forge test --summary` | Per-suite breakdown |
| `FOUNDRY_PROFILE=ci forge test` | 2,000 fuzz runs, 512 invariant runs |
| `forge fmt` | Format |
| `forge build --sizes` | Contract sizes |

### `keeper`

| | |
|---|---|
| `npm run dry` | One pass, no transactions. Start here |
| `npm run once` | One pass, live |
| `npm start` | Continuous |

## Conventions

**Money is bigint, everywhere.** Base units plus a decimals count, converted to a
string only at render. Nothing is compared as a `Number`.

**ABIs are generated.** Never hand-edit `src/lib/abi.generated.ts`.

**One place per fact.** Chain IDs live in `lib/chains.ts`. Formatting lives in
`lib/format.ts`. Readiness copy lives in `lib/readiness.ts`. If a value appears
in two files, one of them is wrong — that is how the previous build shipped
three chain IDs.
