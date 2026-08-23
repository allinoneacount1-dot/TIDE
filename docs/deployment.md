# Deployment

## Robinhood Chain testnet (46630)

Chain 46630 has **no official stock tokens, no DEX aggregator and no Chainlink
feeds**. Verified against Robinhood's asset registry (which returns `chainId:
4663` only), 0x's and 1inch's supported-chain lists, and Chainlink's feed
directory (no testnet file exists).

So a testnet deployment brings its own market: `DeploySimulated` publishes mock
USDG, mock equities, a mock router and mock feeds. The contracts, transactions
and accounting are real; the market is not, and the interface labels it
**Simulated** everywhere it appears.

### 1. Get testnet ETH

From `faucet.testnet.chain.robinhood.com`, into the address you will deploy from.

### 2. Deploy

Use a keystore rather than an environment variable — a private key in `.env` is
one `cat` away from a screen share.

```bash
cd contracts

# once
cast wallet import tide-deployer --interactive

forge script script/DeploySimulated.s.sol:DeploySimulated \
  --rpc-url https://rpc.testnet.chain.robinhood.com \
  --account tide-deployer \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api
```

Optional environment:

| | | |
|---|---|---|
| `TIDE_TREASURY` | fee recipient | defaults to the deployer |
| `TIDE_KEEPER` | default keeper | defaults to the deployer |
| `TIDE_FEE_BPS` | fee, max 50 | defaults to 15 (0.15%) |

The script writes `contracts/deployments/46630.json`.

### 3. Point the frontend at it

```bash
cd ../frontend
pnpm sync:contracts     # reads the deployment record above
```

That is all — no address needs pasting. For a hosted build, set
`NEXT_PUBLIC_TIDE_REGISTRY_46630` instead and it takes precedence.

### 4. Run a keeper

```bash
cd ../keeper
cp .env.example .env
# RPC_URL, CHAIN_ID=46630, REGISTRY_ADDRESS, KEEPER_PRIVATE_KEY,
# SIMULATED_ROUTER (from the deployment record)
npm run dry     # verify it sees your vaults
npm start
```

---

## Robinhood Chain mainnet (4663)

Uses the real market: USDG, the real equity tokens, Uniswap v3, and Chainlink
feeds. Every address is in `script/Chains.sol`, verified against Robinhood's docs
and Blockscout.

> Read [security.md](security.md) first. This code has not been audited.

```bash
cd contracts

forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url https://rpc.mainnet.chain.robinhood.com \
  --account tide-deployer \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://robinhoodchain.blockscout.com/api
```

The script refuses to run on any other chain.

It allowlists Uniswap's `SwapRouter02`, `UniversalRouter` and `Permit2`, and
binds Chainlink feeds for USDG, AAPL, NVDA, SPY, MSFT, GOOGL, AMZN, QQQ and PLTR.

### After deploying

1. **Move ownership to a multisig.**
   ```bash
   cast send $REGISTRY "transferOwnership(address)" $SAFE --account tide-deployer
   # then accept from the Safe — ownership is two-step
   ```
2. **Set a dedicated keeper**, funded with gas and nothing else.
   ```bash
   cast send $REGISTRY "setDefaultKeeper(address)" $KEEPER --account tide-deployer
   ```
3. **Verify the router allowlist** contains only what you intend. This is the
   most security-critical setting in the protocol.
   ```bash
   cast call $REGISTRY "isRouterAllowed(address)(bool)" $ROUTER
   ```

---

## Frontend hosting

Any Next.js host. On Vercel:

```
Root directory      frontend
Build command       pnpm build
Install command     pnpm install
```

Environment — see `frontend/.env.example`. The minimum for mainnet:

```bash
NEXT_PUBLIC_DEFAULT_CHAIN_ID=4663
NEXT_PUBLIC_TIDE_REGISTRY_4663=0x...
ZEROX_API_KEY=...                        # server-only. required for routing
NEXT_PUBLIC_ROBINHOOD_RPC_URL=...        # optional but recommended
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=... # optional; omit and it is not registered
```

`prebuild` regenerates ABIs from `contracts/out`, so the contracts must be built
in the same checkout. If you deploy the frontend from a separate repository,
commit `src/lib/abi.generated.ts` and `src/lib/deployments.generated.ts`.

> **Vercel Hobby cannot run the keeper.** Cron is capped at once per day with
> ±59 minutes of drift, and sub-daily expressions are rejected at deploy time.
> Host the keeper on Actions or a VPS.

---

## Verifying a deployment

```bash
# the registry knows its implementation
cast call $REGISTRY "implementation()(address)" --rpc-url $RPC

# the fee is what you set, and below the ceiling
cast call $REGISTRY "feeBps()(uint16)"     --rpc-url $RPC
cast call $REGISTRY "MAX_FEE_BPS()(uint16)" --rpc-url $RPC

# a vault address is deterministic before it exists
cast call $REGISTRY "predictVaultAddress(address,uint256)(address)" $USER 0 --rpc-url $RPC
```
