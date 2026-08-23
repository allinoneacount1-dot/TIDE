# TIDE contracts

Foundry. Two contracts and a price library.

| | |
|---|---|
| `TideRegistry.sol` | Per-chain configuration and vault deployment. Holds no capital |
| `TideVault.sol` | Per-user vault. Capital, plans, execution, withdrawal |
| `libraries/PriceMath.sol` | Conversions on a fixed 1e8 price scale |
| `mocks/` | A market for devnet and testnet, plus hostile counterparties for tests |

```bash
forge install
forge build
forge test           # 54 tests
forge test --summary
```

Full reference: [`docs/contracts.md`](../docs/contracts.md).
Deployment: [`docs/deployment.md`](../docs/deployment.md).
Threat model: [`docs/security.md`](../docs/security.md).

## Deploy

```bash
# a complete simulated market — devnet, and Robinhood Chain testnet, which has
# no stock tokens, no aggregator and no price feeds of its own
forge script script/DeploySimulated.s.sol:DeploySimulated \
  --rpc-url $RPC --broadcast --account tide-deployer

# the real market on chain 4663
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url $RPC --broadcast --account tide-deployer
```

Both write `deployments/<chainId>.json`, which the frontend reads via
`pnpm sync:contracts`.

> Deploy with a keystore, not a `PRIVATE_KEY` in a dotfile:
> `cast wallet import tide-deployer --interactive`
