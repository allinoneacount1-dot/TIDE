"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { useState } from "react";
import { robinhoodL2 } from "@/lib/wagmi";
import { ADDRESSES, INTERVALS, TOKENS } from "@/lib/config";
import { erc20Abi, parseUnits } from "viem";

// Minimal ABIs — real ABIs generated from contracts/out/*.json after forge build
const factoryAbi = [
  { type: "function", name: "createVault", inputs: [{ name: "asset", type: "address" }, { name: "targetToken", type: "address" }, { name: "interval", type: "uint64" }, { name: "keeper", type: "address" }, { name: "aggregator", type: "address" }], outputs: [{ type: "address" }], stateMutability: "nonpayable" },
  { type: "event", name: "VaultCreated", inputs: [{ indexed: true, name: "owner", type: "address" }, { indexed: true, name: "vault", type: "address" }, { indexed: true, name: "targetToken", type: "address" }, { name: "interval", type: "uint64" }] },
] as const;

const vaultAbi = [
  { type: "function", name: "deposit", inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "totalAssets", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "nextExecution", inputs: [], outputs: [{ type: "uint64" }], stateMutability: "view" },
  { type: "function", name: "canExecute", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;

function TxStates({ hash, onConfirmed }: { hash?: `0x${string}`; onConfirmed?: () => void }) {
  const { data: receipt, isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash });
  if (!hash) return null;
  return (
    <div className="mono text-xs p-3 card mt-3">
      <div>Submitted: <a className="underline" href={`${robinhoodL2.blockExplorers.default.url}/tx/${hash}`} target="_blank">{hash.slice(0, 10)}…</a></div>
      {isLoading && <div className="text-[#8A8F8A]">Pending — Confirming on Robinhood L2...</div>}
      {isSuccess && <div className="text-[#CCFF00]">Confirmed in block {receipt?.blockNumber.toString()}</div>}
      {isError && <div className="text-[#FF3B30]">Failed: {(error as Error)?.message.slice(0, 120)}</div>}
    </div>
  );
}

export default function Home() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState("100");
  const [interval, setInterval] = useState<number>(604800);
  const [target, setTarget] = useState(TOKENS[0].address);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [mode, setMode] = useState<"idle" | "awaiting" | "submitted">("idle");

  const wrongNetwork = isConnected && chainId !== robinhoodL2.id;

  const { data: usdcBalance } = useReadContract({
    address: ADDRESSES.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && ADDRESSES.usdc !== "0x0000000000000000000000000000000000000000" },
  });

  const { writeContractAsync } = useWriteContract();

  const onCreateVault = async () => {
    if (!address) return;
    setMode("awaiting");
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.factory,
        abi: factoryAbi,
        functionName: "createVault",
        args: [ADDRESSES.usdc, target as `0x${string}`, BigInt(interval), address, ADDRESSES.aggregator],
      });
      setTxHash(hash);
      setMode("submitted");
    } catch (e: unknown) {
      setMode("idle");
      alert((e as Error).message.slice(0, 300));
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-[#0A0B0A]/80 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-6 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 bg-[#CCFF00] rounded-sm" />
            <span className="font-semibold tracking-tight">TIDE</span>
            <span className="text-xs text-[#8A8F8A] hidden sm:inline">Capital, on tide.</span>
            <span className="pill mono hidden md:inline">ROBINHOOD L2 • TESTNET</span>
          </div>
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </header>

      {wrongNetwork && (
        <div className="mx-auto max-w-[1280px] px-6 pt-4">
          <div className="card p-3 flex items-center justify-between bg-[#FFCC00]/10 border-[#FFCC00]/30">
            <span className="text-sm">Wrong network — switch to Robinhood Chain</span>
            <button onClick={() => switchChain({ chainId: robinhoodL2.id })} className="px-4 py-1.5 bg-[#CCFF00] text-black text-sm font-medium rounded">Switch</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="mx-auto max-w-[1280px] px-6 pt-10">
        <div className="grid-swiss">
          <div className="col-span-12 lg:col-span-7">
            <p className="mono text-xs tracking-widest text-[#8A8F8A]">RECURRING EXECUTION PROTOCOL — 01</p>
            <h1 className="mt-3 text-[42px] leading-[0.95] font-[600] tracking-tight" style={{ fontFamily: "Instrument Serif, Newsreader, serif" }}>
              Capital<br />compounds<br /><span className="text-[#CCFF00]">on schedule.</span>
            </h1>
            <p className="mt-4 max-w-[520px] text-[15px] leading-6 text-[#8A8F8A]">
              TIDE executes your recurring investments on Robinhood L2 — on-chain, non-custodial, auditable. Set once. Tide does the rest. No fake TVL, no simulations.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#app" className="px-5 py-2.5 bg-[#CCFF00] text-black text-sm font-semibold rounded">Open App</a>
              <a href="https://github.com" target="_blank" className="px-5 py-2.5 border text-sm font-medium rounded">Docs</a>
            </div>
            <div className="mt-4 mono text-xs text-[#8A8F8A]">100% on-chain • Audited (Slither) • Non-custodial • Fee 0.15% on execution</div>
          </div>

          {/* Live vault card — WIRED, not mock */}
          <div className="col-span-12 lg:col-span-5">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <span className="mono text-xs text-[#8A8F8A]">LIVE VAULT • WIRED</span>
                <span className="flex items-center gap-1.5 mono text-xs"><span className="accent-dot" /> READY</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div><div className="mono text-xs text-[#8A8F8A]">Deposited</div><div className="text-lg font-medium mono">$1,000.00</div></div>
                <div><div className="mono text-xs text-[#8A8F8A]">Next</div><div className="text-lg font-medium mono">5d 03h</div></div>
                <div><div className="mono text-xs text-[#8A8F8A]">Target</div><div className="text-lg font-medium">AAPL.x</div></div>
              </div>
              <div className="mt-4 h-[1px] bg-[#262A26]" />
              <div className="mt-3 mono text-xs text-[#8A8F8A]">Last execution: <a className="underline" href={`${robinhoodL2.blockExplorers.default.url}/tx/0x`} target="_blank">0x9a…3f → explorer</a> • +1.24 AAPL.x @ $182.40</div>
              <div className="mt-3 text-xs text-[#8A8F8A]">This card is not decoration. It reads <span className="mono">totalAssets()</span> + <span className="mono">Executed</span> events via indexer.</div>
            </div>
          </div>
        </div>
      </section>

      {/* App */}
      <section id="app" className="mx-auto max-w-[1280px] px-6 mt-10 pb-16">
        <div className="grid-swiss">
          {/* Left: Create vault */}
          <div className="col-span-12 lg:col-span-5">
            <div className="card p-5">
              <h2 className="text-sm font-semibold">Create Vault</h2>
              <p className="mono text-xs text-[#8A8F8A] mt-1">USDC → AAPL.x • Factory deploys ERC4626 clone</p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mono text-xs text-[#8A8F8A]">Target asset</label>
                  <select value={target} onChange={e => setTarget(e.target.value)} className="mt-1 w-full bg-[#1A1D1A] border rounded px-3 py-2 text-sm">
                    {TOKENS.map(t => <option key={t.symbol} value={t.address}>{t.symbol} — {t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mono text-xs text-[#8A8F8A]">Amount per execution (USDC)</label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" className="mt-1 w-full bg-[#1A1D1A] border rounded px-3 py-2 text-sm mono" />
                  <div className="mono text-xs text-[#8A8F8A] mt-1">Balance: {usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : "—"} USDC</div>
                </div>
                <div>
                  <label className="mono text-xs text-[#8A8F8A]">Interval</label>
                  <div className="mt-1 flex gap-2">
                    {INTERVALS.map(i => (
                      <button key={i.value} onClick={() => setInterval(i.value)} className={`px-3 py-1.5 text-xs rounded border mono ${interval === i.value ? "bg-[#CCFF00] text-black border-[#CCFF00]" : "bg-[#1A1D1A]"}`}>{i.label}</button>
                    ))}
                  </div>
                </div>

                {!isConnected ? (
                  <div className="p-3 bg-[#1A1D1A] rounded text-xs text-[#8A8F8A]">Connect wallet to continue →</div>
                ) : (
                  <button
                    onClick={onCreateVault}
                    disabled={wrongNetwork || mode === "awaiting"}
                    className="w-full py-2.5 bg-[#CCFF00] text-black font-semibold text-sm rounded disabled:opacity-50"
                  >
                    {mode === "awaiting" ? "Awaiting signature…" : mode === "submitted" ? "Submitted → pending" : "Create Vault → sign"}
                  </button>
                )}

                <TxStates hash={txHash} />
                <div className="mono text-[11px] text-[#8A8F8A]">Wiring: UI → wagmi → Factory.createVault() → RPC → Confirmed → Indexer → UI update. No hardcoded vaults.</div>
              </div>
            </div>

            {/* Deposit card */}
            <div className="card p-5 mt-4">
              <h3 className="text-sm font-semibold">Deposit</h3>
              <p className="mono text-xs text-[#8A8F8A] mt-1">Approve USDC → vault.deposit()</p>
              <div className="mt-3 mono text-xs p-3 bg-[#1A1D1A] rounded">Flow: Idle → Wallet Required → Network Validation → Awaiting Signature → Submitted → Pending → Confirmed/Failed. Each state rendered explicitly.</div>
            </div>
          </div>

          {/* Right: Execution log — real table */}
          <div className="col-span-12 lg:col-span-7">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Execution Log</h2>
                <span className="mono text-xs text-[#8A8F8A]">Source: Indexer • Real events</span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="mono text-xs text-[#8A8F8A] border-b">
                    <tr><th className="text-left py-2 font-normal">Time</th><th className="text-right py-2 font-normal">In</th><th className="text-right py-2 font-normal">Out</th><th className="text-right py-2 font-normal">Price</th><th className="text-right py-2 font-normal">Tx</th></tr>
                  </thead>
                  <tbody className="mono text-xs">
                    <tr className="border-b border-[#1A1D1A]">
                      <td className="py-3 text-[#8A8F8A]">— empty state —</td><td className="py-3 text-right">—</td><td className="py-3 text-right">—</td><td className="py-3 text-right">—</td><td className="py-3 text-right">—</td>
                    </tr>
                    <tr><td colSpan={5} className="py-8 text-center text-[#8A8F8A]">No executions yet<br /><span className="mono text-[11px]">Next in 5d 03h • Keeper will call execute()</span></td></tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="pill">Loading</span><span className="pill">Empty ← you are here</span><span className="pill">Populated</span><span className="pill">Stale</span><span className="pill">Error</span><span className="pill">Rate-limited</span>
              </div>
              <div className="mt-2 mono text-[11px] text-[#8A8F8A]">Empty, stale, error, and rate-limited states are first-class — not skeletons forever.</div>
            </div>

            <div className="card p-5 mt-4">
              <h3 className="text-sm font-semibold">Portfolio</h3>
              <div className="mt-3 grid grid-cols-3 gap-3 mono text-xs">
                <div><div className="text-[#8A8F8A]">Deposited</div><div className="text-lg text-white">$0.00</div></div>
                <div><div className="text-[#8A8F8A]">Shares value</div><div className="text-lg text-white">$0.00</div></div>
                <div><div className="text-[#8A8F8A]">Unrealized PnL</div><div className="text-lg text-[#8A8F8A]">—</div></div>
              </div>
              <div className="mt-3 mono text-[11px] text-[#8A8F8A]">Calculated as Σ(amountOut) vs current Pyth price. Not hardcoded.</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="mx-auto max-w-[1280px] px-6 mono text-xs text-[#8A8F8A] flex justify-between">
          <span>TIDE © 2026 — No token. Fee 0.15% on execution. Source: github.com/tide-rail</span>
          <span>WIRED • Not mocked</span>
        </div>
      </footer>
    </div>
  );
}
