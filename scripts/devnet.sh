#!/usr/bin/env bash
#
# TIDE local devnet — one command.
#
#   ./scripts/devnet.sh
#
# Starts Anvil, deploys the contracts and a complete simulated market, funds a
# test account, points the frontend at it, and starts the app.
#
# Everything it stands up is real: real contracts, real transactions, real
# balances. Only the *market* is simulated — Robinhood Chain testnet has no
# stock tokens, no DEX aggregator and no price feeds, so the deploy script
# publishes mocks and every screen that shows them says SIMULATED.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC="http://127.0.0.1:8545"
# Anvil's first account. Public, deterministic, worthless outside a devnet.
DEPLOYER="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

command -v anvil >/dev/null || { echo "Foundry not found. https://book.getfoundry.sh"; exit 1; }

echo
echo "[1/5] starting anvil (chain 31337 — a devnet, never a real chain id)"
# Reuse a devnet that is already up rather than killing processes by pattern —
# a broad pkill is a good way to take down something the user cared about.
if cast chain-id --rpc-url "$RPC" >/dev/null 2>&1; then
  echo "      a node is already listening on 8545 — reusing it"
else
  anvil --chain-id 31337 --block-time 1 --silent &
  for _ in $(seq 1 20); do
    cast chain-id --rpc-url "$RPC" >/dev/null 2>&1 && break
    sleep 0.5
  done
  cast chain-id --rpc-url "$RPC" >/dev/null || { echo "anvil did not come up"; exit 1; }
fi

echo "[2/5] deploying contracts + simulated market"
( cd "$ROOT/contracts" && forge script script/DeploySimulated.s.sol:DeploySimulated \
    --rpc-url "$RPC" --broadcast --private-key "$DEPLOYER" >/dev/null )

QUOTE=$(python3 -c "import json;print(json.load(open('$ROOT/contracts/deployments/31337.json'))['quote'])")
REGISTRY=$(python3 -c "import json;print(json.load(open('$ROOT/contracts/deployments/31337.json'))['registry'])")
echo "      registry $REGISTRY"
echo "      quote    $QUOTE"

echo "[3/5] funding the first Anvil account with 100,000 USDG"
cast send "$QUOTE" "mint(address,uint256)" "$ACCOUNT" 100000000000 \
  --rpc-url "$RPC" --private-key "$DEPLOYER" >/dev/null

echo "[4/5] pointing the frontend at the devnet"
cat > "$ROOT/frontend/.env.local" <<ENV
# Written by scripts/devnet.sh. Local devnet only.
NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337
NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL=$RPC
ENV

echo "[5/5] starting the app"
cd "$ROOT/frontend"
[ -d node_modules ] || pnpm install
echo
echo "  Import this key into your wallet, add network 31337 at $RPC"
echo "  $DEPLOYER"
echo
echo "  http://localhost:3000/app"
echo
pnpm dev
