import { decodeEventLog, type PublicClient, type Address, type Hex } from "viem";
import { tideVaultAbi } from "./abi.generated";
import { getChain } from "./chains";

/**
 * Execution history.
 *
 * Robinhood Chain produces blocks roughly every 100ms. That is ~864,000 blocks
 * a day, so "scan the last 30 days with eth_getLogs" is 26 million blocks — a
 * few thousand paginated RPC calls per page load. Any design that assumes
 * Ethereum-ish block times silently falls over here.
 *
 * So history comes from Blockscout's indexed log API, which is the chain's
 * official explorer, free, and needs no key. `eth_getLogs` remains as a
 * fallback but is *bounded* to a recent window, and the UI is told which source
 * answered so it can state the coverage rather than implying completeness.
 */

export type ExecutionSource = "blockscout" | "rpc" | "none";

export type ExecutionRecord = {
  planId: bigint;
  target: Address;
  router: Address;
  amountIn: bigint;
  fee: bigint;
  amountOut: bigint;
  /** Realised price, 1e8 scale. */
  price: bigint;
  /** Oracle reference at execution time, 1e8 scale. 0 when unguarded by oracle. */
  referencePrice: bigint;
  cycle: number;
  nextExecution: bigint;
  txHash: Hex;
  blockNumber: bigint;
  timestamp: number;
};

export type ExecutionPage = {
  records: ExecutionRecord[];
  source: ExecutionSource;
  /** Human description of what was actually searched, for the provenance line. */
  coverage: string;
  /** True when the source cannot guarantee full history. */
  partial: boolean;
};

const EXECUTED_TOPIC = "0x" as Hex; // resolved lazily from the ABI below

/** Blocks to scan in the RPC fallback. ~50k blocks is roughly 80 minutes here. */
const RPC_FALLBACK_BLOCKS = 50_000n;

export function blockscoutBase(chainId: number | undefined): string | undefined {
  const url = getChain(chainId)?.blockExplorers?.default.url;
  if (!url || url.includes("127.0.0.1")) return undefined;
  return url;
}

/**
 * Decodes a raw log into an ExecutionRecord, or null when it is not an
 * `Executed` event. Decoding failures are swallowed per-log rather than
 * failing the page: one malformed log should not blank the whole ledger.
 */
function decodeExecuted(
  topics: Hex[],
  data: Hex,
  meta: { txHash: Hex; blockNumber: bigint; timestamp: number }
): ExecutionRecord | null {
  try {
    const decoded = decodeEventLog({
      abi: tideVaultAbi,
      topics: topics as [Hex, ...Hex[]],
      data,
    });
    if (decoded.eventName !== "Executed") return null;
    const a = decoded.args as unknown as {
      planId: bigint;
      target: Address;
      router: Address;
      amountIn: bigint;
      fee: bigint;
      amountOut: bigint;
      price: bigint;
      referencePrice: bigint;
      cycle: number;
      nextExecution: bigint;
    };
    return {
      planId: a.planId,
      target: a.target,
      router: a.router,
      amountIn: a.amountIn,
      fee: a.fee,
      amountOut: a.amountOut,
      price: a.price,
      referencePrice: a.referencePrice,
      cycle: Number(a.cycle),
      nextExecution: a.nextExecution,
      ...meta,
    };
  } catch {
    return null;
  }
}

type BlockscoutLog = {
  topics: (Hex | null)[];
  data: Hex;
  transaction_hash: Hex;
  block_number: number;
  block_timestamp?: string;
};

/** Primary path: the chain's own indexer. Complete history, no key, free tier. */
async function fromBlockscout(vault: Address, chainId: number): Promise<ExecutionPage | null> {
  const base = blockscoutBase(chainId);
  if (!base) return null;

  const res = await fetch(`/api/executions?vault=${vault}&chainId=${chainId}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { items?: BlockscoutLog[]; error?: string };
  if (!body.items) return null;

  const records: ExecutionRecord[] = [];
  for (const log of body.items) {
    const topics = (log.topics ?? []).filter(Boolean) as Hex[];
    if (!topics.length) continue;
    const rec = decodeExecuted(topics, log.data, {
      txHash: log.transaction_hash,
      blockNumber: BigInt(log.block_number),
      timestamp: log.block_timestamp ? Math.floor(Date.parse(log.block_timestamp) / 1000) : 0,
    });
    if (rec) records.push(rec);
  }

  records.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  return {
    records,
    source: "blockscout",
    coverage: "Full history, indexed by Blockscout.",
    partial: false,
  };
}

/**
 * Fallback: a bounded eth_getLogs scan.
 *
 * Deliberately narrow. On a devnet the chain starts at block 0 so the window
 * covers everything; on a public network it covers only the recent past, and
 * `partial` is set so the UI says so instead of presenting a truncated ledger
 * as the complete one.
 */
async function fromRpc(client: PublicClient, vault: Address): Promise<ExecutionPage> {
  const head = await client.getBlockNumber();
  const from = head > RPC_FALLBACK_BLOCKS ? head - RPC_FALLBACK_BLOCKS : 0n;

  const logs = await client.getLogs({
    address: vault,
    fromBlock: from,
    toBlock: head,
  });

  // Timestamps require a block fetch each; dedupe so a page of executions in
  // one block costs one call, not one per row.
  const blockTimes = new Map<bigint, number>();
  const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber).filter((b): b is bigint => b !== null))];
  await Promise.all(
    uniqueBlocks.slice(0, 60).map(async (bn) => {
      try {
        const block = await client.getBlock({ blockNumber: bn });
        blockTimes.set(bn, Number(block.timestamp));
      } catch {
        /* leave unset; the row renders its block number instead of a time */
      }
    })
  );

  const records: ExecutionRecord[] = [];
  for (const log of logs) {
    if (!log.blockNumber || !log.transactionHash) continue;
    const rec = decodeExecuted(log.topics as Hex[], log.data, {
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp: blockTimes.get(log.blockNumber) ?? 0,
    });
    if (rec) records.push(rec);
  }

  records.sort((a, b) => Number(b.blockNumber - a.blockNumber));

  const complete = from === 0n;
  return {
    records,
    source: "rpc",
    coverage: complete
      ? "Full history, read directly from the node."
      : `Direct node scan of the last ${RPC_FALLBACK_BLOCKS.toLocaleString()} blocks. Older executions are not shown.`,
    partial: !complete,
  };
}

export async function fetchExecutions(
  client: PublicClient,
  vault: Address,
  chainId: number
): Promise<ExecutionPage> {
  try {
    const indexed = await fromBlockscout(vault, chainId);
    if (indexed) return indexed;
  } catch {
    /* fall through to the node */
  }

  try {
    return await fromRpc(client, vault);
  } catch {
    return {
      records: [],
      source: "none",
      coverage: "History is unavailable: neither the indexer nor the node responded.",
      partial: true,
    };
  }
}

export { EXECUTED_TOPIC };
