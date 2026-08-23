# Data sources

Every external dependency, its purpose, its real limits, and what happens when it
fails. Figures were verified in August 2026; where something could not be
confirmed it says so rather than guessing.

---

## Chain

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | **4663** | **46630** |
| Public RPC | `rpc.mainnet.chain.robinhood.com` | `rpc.testnet.chain.robinhood.com` |
| Explorer | `robinhoodchain.blockscout.com` | `explorer.testnet.chain.robinhood.com` |
| Gas | ETH | ETH |

Source: [docs.robinhood.com/chain/connecting](https://docs.robinhood.com/chain/connecting)

Public endpoints are rate-limited and documented as unsuitable for production.
Set `NEXT_PUBLIC_ROBINHOOD_RPC_URL` to a private endpoint; the client falls back
to public automatically.

Arbitrum Nitro. `block.number` is an estimated **L1** block number — never use it
for timing. Blocks land roughly every 100ms.

---

## Contracts on chain 4663

| | |
|---|---|
| USDG (Paxos, 6 dp) | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Uniswap v3 SwapRouter02 | `0xCaf681a66D020601342297493863E78C959E5cb2` |
| Uniswap UniversalRouter | `0x8876789976dEcBfCbBbe364623C63652db8C0904` |

> **There is no canonical Circle USDC on Robinhood Chain.** Tokens named
> "USD Coin" on the explorer are impostors with 18 decimals. Never resolve a
> token by symbol on this chain — always by address.

### Tokenized equities

ERC-20, **18 decimals**, plain ticker (`AAPL`, not `AAPL.x`), plus ERC-8056
`uiMultiplier()`.

| | |
|---|---|
| AAPL | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` |
| NVDA | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` |
| SPY | `0x117cc2133c37B721F49dE2A7a74833232B3B4C0C` |
| MSFT | `0xe93237C50D904957Cf27E7B1133b510C669c2e74` |
| GOOGL | `0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3` |
| AMZN | `0x12f190a9F9d7D37a250758b26824B97CE941bF54` |
| QQQ | `0xD5f3879160bc7c32ebb4dC785F8a4F505888de68` |
| PLTR | `0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A` |

The live registry is `api.robinhood.com/rhj/assets` — roughly 100 assets, 60
req/s, no auth. Prefer it over any hardcoded list.

**The multiplier matters.** It grows with dividends and corporate actions, so one
token is not one share over time. Chainlink's feed price is already
multiplier-adjusted; the `/rhj/prices` API is *not*. TIDE uses Chainlink, so its
prices are consistent.

---

## Oracle — Chainlink

Chainlink is Robinhood Chain's official oracle partner. **Pyth is not deployed
there**, which is why the previous Hermes integration could never have guarded
anything.

Standard `AggregatorV3Interface`, 8 decimals, `us_equities_24/5`, 86,400s
heartbeat, 0.5% deviation threshold.

| | |
|---|---|
| USDG / USD | `0x61B7e5650328764B076A108EFF5fa7282a1B9aD2` |
| AAPL / USD | `0x6B22A786bAa607d76728168703a39Ea9C99f2cD0` |
| NVDA / USD | `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` |
| SPY / USD | `0x319724394D3A0e3669269846abE664Cd621f9f6A` |
| MSFT / USD | `0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E` |
| GOOGL / USD | `0xF6f373a037c30F0e5010d854385cA89185AE638b` |
| AMZN / USD | `0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C` |
| QQQ / USD | `0x80901d846d5D7B030F26B480776EE3b29374C2ae` |
| PLTR / USD | `0x820ABedFF239034956B7A9d2F0a331f9F075eB4c` |

Directory: `docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood`

**Cost:** free to read on chain.
**Failure:** `OracleStale`. Executions block; deposits and withdrawals are
unaffected. Outside market hours this is the expected state.
**No feeds on testnet** — the directory has no testnet file.

---

## Swap routing — 0x Swap API v2

| | |
|---|---|
| Endpoint | `api.0x.org/swap/allowance-holder/quote` |
| Headers | `0x-api-key` (required), `0x-version: v2` |
| Free tier | ~5 requests/second |
| Chains | 4663 supported. **46630 is not** |

Must be called server-side: the `0x-version` header makes the request
non-simple, and 0x does not answer the browser preflight.

**Failure:** the execute drawer shows "No route available" with the reason and
does not offer a signature. The keeper skips the cycle.
**Alternative:** 1inch also supports 4663. Uniswap v3 is natively deployed.

---

## History — Blockscout

`{explorer}/api/v2/addresses/{vault}/logs`. Free, no key.

At ~100ms blocks, a month is roughly 26 million blocks, so `eth_getLogs` over any
useful range is not viable. Blockscout is the primary source.

**Failure:** falls back to a bounded `eth_getLogs` scan of the last 50,000 blocks
(~80 minutes) and the interface labels the result as partial with the exact
coverage. It never presents a truncated ledger as complete.

---

## Automation

| | |
|---|---|
| Chainlink Automation | **Not supported** on 4663 or 46630 |
| Gelato Web3 Functions | **Not supported** |

There is no managed keeper for this chain. TIDE ships its own — see
[`keeper/`](../keeper/README.md).

| Host | Cost | Caveat |
|---|---|---|
| GitHub Actions cron | Free (unlimited minutes on public repos) | Commonly delayed 5–20 min; auto-disabled after 60 days of repo inactivity |
| Small VPS | ~$4–6/mo | Real cron precision, persistent signer |
| Vercel Cron (Hobby) | Free | **Minimum once per day**, ±59 min. Unusable for hourly plans |

Vercel Hobby rejects `0 * * * *` at deploy time. If you host the frontend on
Vercel Hobby, the keeper must live elsewhere.

---

## Optional services

| | Free tier | Used for |
|---|---|---|
| Alchemy | 30M compute units/mo, 500 CUPS | Private RPC. Robinhood's recommended provider |
| Reown (WalletConnect) | 500 MAU/mo, hard cutoff | Mobile wallets. Omit the project ID and the connector is simply not registered |
| Vercel Hobby | 1M function invocations | Hosting. Non-commercial use only |

TIDE needs **none** of these to run. With no API keys at all it works against
public RPC, on-chain Chainlink reads, and Blockscout — the whole stack is $0.

---

## Cost summary

| | Monthly |
|---|---|
| Contracts (read) | $0 |
| Public RPC + Blockscout + Chainlink | $0 |
| Frontend on Vercel Hobby | $0 |
| Keeper on GitHub Actions | $0 (with schedule drift) |
| Keeper on a VPS | ~$5 |
| **Total** | **$0–5** |

Gas is paid by the user, per transaction, in ETH.
