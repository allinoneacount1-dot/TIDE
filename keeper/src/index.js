#!/usr/bin/env node
/**
 * TIDE keeper.
 *
 * Walks every vault in the registry, finds plans whose window is open, and calls
 * `execute()`.
 *
 * It is intentionally stateless and idempotent: a pass reads current chain state,
 * acts, and exits. Two keepers running at once is wasteful but harmless — the
 * second's transaction reverts with NotReady because the first already advanced
 * the cadence.
 *
 * Its authority is exactly one function. It cannot withdraw, cannot alter a plan,
 * and cannot execute below a vault's on-chain floor, because the contract
 * recomputes that floor and takes whichever is tighter. A leaked keeper key is a
 * denial of service and a gas bill, not a loss of user funds.
 */
import { createPublicClient, createWalletClient, http, formatEther, formatGwei } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { registryAbi, vaultAbi, READINESS } from "./abi.js";
import { resolveRoute } from "./routes.js";

const args = new Set(process.argv.slice(2));
const ONCE = args.has("--once");
const DRY = args.has("--dry-run");

const log = {
  info: (m) => console.log(`${stamp()} ${m}`),
  warn: (m) => console.warn(`${stamp()} WARN  ${m}`),
  error: (m) => console.error(`${stamp()} ERROR ${m}`),
  ok: (m) => console.log(`${stamp()} OK    ${m}`),
};

function stamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function required(name) {
  const v = process.env[name];
  if (!v) {
    log.error(`${name} is not set. See .env.example.`);
    process.exit(1);
  }
  return v;
}

const config = {
  rpcUrl: required("RPC_URL"),
  chainId: Number(required("CHAIN_ID")),
  registry: required("REGISTRY_ADDRESS"),
  privateKey: DRY ? process.env.KEEPER_PRIVATE_KEY : required("KEEPER_PRIVATE_KEY"),
  zeroExKey: process.env.ZEROX_API_KEY || "",
  simulatedRouter: process.env.SIMULATED_ROUTER || "",
  pollSeconds: Number(process.env.POLL_SECONDS || 60),
  maxGasGwei: Number(process.env.MAX_GAS_GWEI || 5),
  vaultFilter: (process.env.VAULTS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean),
};

const chain = {
  id: config.chainId,
  name: `chain-${config.chainId}`,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
};

const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl, { timeout: 15_000 }) });
const account = config.privateKey ? privateKeyToAccount(config.privateKey) : null;
const walletClient = account
  ? createWalletClient({ account, chain, transport: http(config.rpcUrl, { timeout: 15_000 }) })
  : null;

const PAGE = 100;

async function listVaults() {
  const total = await publicClient.readContract({
    address: config.registry,
    abi: registryAbi,
    functionName: "vaultCount",
  });

  const all = [];
  for (let i = 0n; i < total; i += BigInt(PAGE)) {
    const page = await publicClient.readContract({
      address: config.registry,
      abi: registryAbi,
      functionName: "vaultsSlice",
      args: [i, BigInt(PAGE)],
    });
    all.push(...page);
  }

  if (config.vaultFilter.length === 0) return all;
  return all.filter((v) => config.vaultFilter.includes(v.toLowerCase()));
}

async function processVault(vault) {
  const [keeper, quote, plansLength] = await Promise.all([
    publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "keeper" }),
    publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "quote" }),
    publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "plansLength" }),
  ]);

  // Skip vaults that have not named us. Attempting anyway wastes an RPC round
  // trip per plan and produces noise that hides real problems.
  if (account && keeper.toLowerCase() !== account.address.toLowerCase()) return 0;

  let executed = 0;

  for (let planId = 0n; planId < plansLength; planId++) {
    const [ready, reason] = await publicClient.readContract({
      address: vault,
      abi: vaultAbi,
      functionName: "canExecute",
      args: [planId],
    });

    if (!ready) {
      // NotDue is the normal state and is not worth a line.
      if (reason !== 3) {
        log.info(`  ${short(vault)}#${planId} — ${READINESS[reason] ?? reason}`);
      }
      continue;
    }

    const plan = await publicClient.readContract({
      address: vault,
      abi: vaultAbi,
      functionName: "getPlan",
      args: [planId],
    });

    const route = await resolveRoute({
      client: publicClient,
      chainId: config.chainId,
      config,
      vault,
      quote,
      plan,
      log,
    });
    if (!route) continue;

    // The floor the contract will enforce. Checking it here turns a reverted
    // transaction the user pays for into a skipped cycle that costs nothing.
    const floor = await publicClient.readContract({
      address: vault,
      abi: vaultAbi,
      functionName: "requiredOutFor",
      args: [planId],
    });

    if (route.expectedOut < floor) {
      log.warn(
        `  ${short(vault)}#${planId} — route ${route.expectedOut} is below the on-chain floor ${floor}; skipping`
      );
      continue;
    }

    const minOut = route.minOut > floor ? route.minOut : floor;

    if (DRY) {
      log.ok(`  ${short(vault)}#${planId} — would execute via ${route.source}, minOut ${minOut}`);
      executed++;
      continue;
    }

    try {
      // Simulate first. A revert here costs nothing; a revert on chain costs gas
      // and produces a failed transaction in the user's history.
      const { request } = await publicClient.simulateContract({
        address: vault,
        abi: vaultAbi,
        functionName: "execute",
        args: [planId, minOut, route.router, route.spender, route.swapData],
        account,
      });

      const hash = await walletClient.writeContract(request);
      log.info(`  ${short(vault)}#${planId} — submitted ${hash}`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status === "success") {
        log.ok(`  ${short(vault)}#${planId} — settled in block ${receipt.blockNumber}`);
        executed++;
      } else {
        log.error(`  ${short(vault)}#${planId} — reverted on chain (${hash})`);
      }
    } catch (error) {
      log.error(`  ${short(vault)}#${planId} — ${firstLine(error)}`);
    }
  }

  return executed;
}

async function pass() {
  const halted = await publicClient.readContract({
    address: config.registry,
    abi: registryAbi,
    functionName: "executionsHalted",
  });
  if (halted) {
    log.warn("protocol executions are halted; nothing to do");
    return;
  }

  const gasPrice = await publicClient.getGasPrice();
  if (Number(formatGwei(gasPrice)) > config.maxGasGwei) {
    log.warn(`gas is ${formatGwei(gasPrice)} gwei, above MAX_GAS_GWEI=${config.maxGasGwei}; skipping pass`);
    return;
  }

  if (account) {
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance === 0n) {
      log.error(`keeper ${account.address} has no ETH for gas`);
      return;
    }
    if (balance < 10n ** 15n) {
      log.warn(`keeper balance is ${formatEther(balance)} ETH — top it up soon`);
    }
  }

  const vaults = await listVaults();
  log.info(`scanning ${vaults.length} vault${vaults.length === 1 ? "" : "s"}`);

  let total = 0;
  for (const vault of vaults) {
    try {
      total += await processVault(vault);
    } catch (error) {
      log.error(`${short(vault)} — ${firstLine(error)}`);
    }
  }

  log.info(`pass complete — ${total} execution${total === 1 ? "" : "s"}`);
}

function short(a) {
  return `${a.slice(0, 8)}…${a.slice(-4)}`;
}

function firstLine(error) {
  const m = error instanceof Error ? error.message : String(error);
  return m.split("\n")[0].slice(0, 200);
}

async function main() {
  log.info(`TIDE keeper — chain ${config.chainId}, registry ${short(config.registry)}`);
  if (account) log.info(`signer ${account.address}`);
  if (DRY) log.warn("dry run — no transactions will be sent");
  if (config.simulatedRouter) log.warn(`using simulated router ${short(config.simulatedRouter)}`);

  if (ONCE || DRY) {
    await pass();
    return;
  }

  // Sequential, never overlapping: a pass that runs long must not have a second
  // one start behind it and race for the same nonce.
  for (;;) {
    try {
      await pass();
    } catch (error) {
      log.error(firstLine(error));
    }
    await new Promise((r) => setTimeout(r, config.pollSeconds * 1_000));
  }
}

main().catch((error) => {
  log.error(firstLine(error));
  process.exit(1);
});
