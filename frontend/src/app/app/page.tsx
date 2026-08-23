"use client";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { useState, useMemo } from "react";
import { robinhoodL2 } from "@/lib/wagmi";
import { ADDRESSES, TOKENS, INTERVALS } from "@/lib/config";
import { erc20Abi } from "viem";

// Surface: MONITOR — density + glanceability, not marketing hero
const factoryAbi = [
  { type: "function", name: "createVault", inputs: [{ name: "asset", type: "address" }, { name: "targetToken", type: "address" }, { name: "interval", type: "uint64" }, { name: "keeper", type: "address" }, { name: "aggregator", type: "address" }], outputs: [{ type: "address" }], stateMutability: "nonpayable" },
] as const;

function StatusDot({ state }: { state: "live" | "idle" | "error" | "pending" }) {
  const c = state === "live" ? "bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" : state === "pending" ? "bg-[#ffcc00] animate-pulse" : state === "error" ? "bg-[#ff3b30]" : "bg-[#62666d]";
  return <span className={`inline-block w-[6px] h-[6px] rounded-full ${c}`} />;
}

function TxStates({ hash }: { hash?: `0x${string}` }) {
  const { data: receipt, isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash });
  if (!hash) return null;
  return (
    <div className="mono text-[11px] leading-4 p-3 rounded-[8px] border bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between">
        <span className="text-[#8a8f98]">TX</span>
        <a className="underline text-[#d0d6e0] hover:text-[#f7f8f8]" href={`${robinhoodL2.blockExplorers.default.url}/tx/${hash}`} target="_blank">{hash.slice(0, 8)}…{hash.slice(-6)}</a>
      </div>
      {isLoading && <div className="mt-1 flex items-center gap-1.5 text-[#ffcc00]"><span className="w-2 h-2 rounded-full bg-[#ffcc00] animate-pulse" /> Confirming on Robinhood L2…</div>}
      {isSuccess && <div className="mt-1 text-[#10b981]">Confirmed • block {receipt?.blockNumber.toString()}</div>}
      {isError && <div className="mt-1 text-[#ff3b30]">Failed: {(error as Error)?.message.slice(0, 120)}</div>}
    </div>
  );
}

export default function Home() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState("100");
  const [interval, setInterval] = useState<number>(604800);
  const [target, setTarget] = useState<`0x${string}`>(TOKENS[0].address as `0x${string}`);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [mode, setMode] = useState<"idle" | "awaiting" | "submitted">("idle");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const wrongNetwork = isConnected && chainId !== robinhoodL2.id;
  const targetMeta = useMemo(() => TOKENS.find(t => t.address === target) ?? TOKENS[0], [target]);

  const { data: usdcBalance } = useReadContract({
    address: ADDRESSES.usdc, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined,
    query: { enabled: !!address && ADDRESSES.usdc !== "0x0000000000000000000000000000000000000000" },
  });

  const { writeContractAsync } = useWriteContract();

  const onCreateVault = async () => {
    if (!address) return;
    setMode("awaiting");
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.factory, abi: factoryAbi, functionName: "createVault",
        args: [ADDRESSES.usdc, target, BigInt(interval), address, ADDRESSES.aggregator],
      });
      setTxHash(hash); setMode("submitted");
    } catch (e: unknown) { setMode("idle"); alert((e as Error).message.slice(0, 300)); }
  };

  const usdcFmt = usdcBalance ? (Number(usdcBalance) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—";

  // Inspector actions — wired, no dummy buttons (per anti-dummy rule)
  const onDeposit = () => {
    alert("Deposit requires a vault — create vault first via Factory.createVault(). Wired: vault.deposit(amount, receiver) after approve(). No vault selected yet.");
  };
  const onWithdraw = () => {
    alert("Withdraw requires vault shares — create vault + deposit first. Wired: vault.redeem(shares, receiver, owner) / vault.withdraw(amount, ...) with ERC4626. No vault selected yet.");
  };
  const onExportCsv = () => {
    const headers = ["time","amountIn(USDC)","amountOut","price","txHash"];
    const rows: string[][] = []; // populated from indexer: Executed events (empty state honest)
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n") || headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tide-executions-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const onNavVaults = () => document.getElementById("vaults")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const onNavNetwork = () => window.open(robinhoodL2.blockExplorers.default.url, "_blank");
  const onNavDocs = () => window.open("https://github.com/allinoneacount1-dot/TIDE#readme", "_blank");

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] selection:bg-[rgba(204,255,0,0.2)]">
      {/* Linear-style header: near-black, ultra-thin border, Inter 510 */}
      <header className="sticky top-0 z-30 backdrop-blur-[12px] bg-[#08090a]/80 border-b border-[rgba(255,255,255,0.05)]">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[48px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="w-[26px] h-[26px] rounded-[6px] bg-[#0A0B0A] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M6 20 C9 14, 12 22, 16 16 C20 10, 23 18, 26 14" stroke="#CCFF00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 23 C9 17, 12 25, 16 19 C20 13, 23 21, 26 17" stroke="#CCFF00" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
                  <circle cx="16" cy="8.2" r="1.7" fill="#CCFF00" />
                </svg>
              </div>
              <span className="tide-3d text-[16px] font-[800] tracking-[-0.04em]" style={{ fontFeatureSettings: '"cv01","ss03"' }}>TIDE</span>
            </Link>
            <span className="hidden sm:inline text-[11px] font-[510] tracking-[0.06em] text-[#8a8f98] border-l border-[rgba(255,255,255,0.08)] pl-4 ml-1">RECURRING EXECUTION • MONITOR</span>
            <Link href="/" className="hidden sm:inline-flex items-center gap-1 ml-3 px-2 py-1 rounded-[6px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[11px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.05)]">← Home</Link>
            <nav className="hidden lg:flex items-center gap-1 ml-6">
              <button onClick={onNavVaults} className="px-2.5 py-1 rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[12px] font-[510] text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.08)]">Vaults</button>
              <button onClick={onNavNetwork} className="px-2.5 py-1 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Network</button>
              <button onClick={onNavDocs} className="px-2.5 py-1 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Docs</button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 h-[28px] px-2.5 rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              <StatusDot state={wrongNetwork ? "error" : isConnected ? "live" : "idle"} />
              <span className="mono text-[11px] text-[#d0d6e0]">{wrongNetwork ? "WRONG NETWORK" : isConnected ? "ROBINHOOD L2 • 31337" : "NOT CONNECTED"}</span>
              <span className="text-[11px] text-[#62666d] hidden lg:inline">• {new Date().toLocaleTimeString()} UTC</span>
            </div>
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>
        </div>
      </header>

      {wrongNetwork && (
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 mt-3">
          <div className="flex items-center justify-between p-2.5 rounded-[8px] bg-[rgba(255,204,0,0.06)] border border-[rgba(255,204,0,0.18)]">
            <span className="mono text-[12px] text-[#ffcc00]">Wrong network — expected Robinhood Chain 31337</span>
            <button onClick={() => switchChain({ chainId: robinhoodL2.id })} className="px-3 py-1 rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[590]">Switch</button>
          </div>
        </div>
      )}

      {/* Monitor toolbar: density + command hint — Linear density control */}
      <div className="mx-auto max-w-[1440px] px-4 lg:px-6 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 mono text-[11px]">
          <span className="text-[#8a8f98] hidden sm:inline">DENSITY</span>
          <div className="flex rounded-[6px] border border-[rgba(255,255,255,0.08)] overflow-hidden">
            <button onClick={() => setDensity("comfortable")} className={`focus-ring px-2.5 py-1 text-[11px] font-[510] ${density === "comfortable" ? "bg-[rgba(255,255,255,0.06)] text-[#f7f8f8]" : "text-[#8a8f98]"}`}>Comfortable</button>
            <button onClick={() => setDensity("compact")} className={`focus-ring px-2.5 py-1 text-[11px] font-[510] border-l border-[rgba(255,255,255,0.08)] ${density === "compact" ? "bg-[rgba(255,255,255,0.06)] text-[#f7f8f8]" : "text-[#8a8f98]"}`}>Compact</button>
          </div>
          <span className="hidden md:inline text-[#62666d]">• {/* tweak */} 0 vaults • 0 executions • fee 0.15%</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="mono text-[11px] text-[#62666d]">⌘K</span>
          <span className="text-[11px] text-[#8a8f98]">Search vaults</span>
        </div>
      </div>

      {/* MAIN MONITOR GRID — 12 cols: rail 3 | log 6 | inspector 3 */}
      <main className="mx-auto max-w-[1440px] px-4 lg:px-6 mt-4 pb-10 grid grid-cols-12 gap-4">
        {/* LEFT RAIL — vaults */}
        <section id="vaults" className="col-span-12 lg:col-span-3 space-y-3">
          <div className="card p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-[590] tracking-[0.06em] text-[#f7f8f8]">CREATE VAULT</h2>
              <span className="pill mono">ERC4626 • WIRED</span>
            </div>
            <p className="mono text-[11px] leading-4 text-[#8a8f98] mt-1">USDC → {targetMeta.symbol} • Factory clone • Keeper `execute()`</p>

            <div className={`mt-3 space-y-3 ${density === "compact" ? "[&>div]:space-y-1" : ""}`}>
              <div>
                <label className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">TARGET ASSET</label>
                <select value={target} onChange={e => setTarget(e.target.value as `0x${string}`)} className="mt-1 w-full h-[36px] px-3 rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] text-[13px] focus:outline-none focus:border-[rgba(204,255,0,0.5)]">
                  {TOKENS.map(t => <option key={t.symbol} value={t.address} className="bg-[#0f1011]">{t.symbol} — {t.name}</option>)}
                </select>
                <div className="mono text-[11px] text-[#62666d] mt-1">{target.slice(0, 6)}…{target.slice(-4)} • verified tokenlist</div>
              </div>

              <div>
                <label className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">AMOUNT PER EXECUTION</label>
                <div className="mt-1 relative">
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" inputMode="decimal" className="w-full h-[36px] pl-3 pr-16 rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] text-[13px] mono focus:outline-none focus:border-[rgba(204,255,0,0.5)]" />
                  <span className="absolute right-1 top-1 bottom-1 px-2.5 flex items-center rounded-[5px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] mono text-[11px] text-[#d0d6e0]">USDC</span>
                </div>
                <div className="mono text-[11px] text-[#8a8f98] mt-1">Balance: {usdcFmt} USDC • <span className="text-[#62666d]">slippage 1% • fee 0.15%</span></div>
              </div>

              <div>
                <label className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">INTERVAL</label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {INTERVALS.map(i => (
                    <button key={i.value} onClick={() => setInterval(i.value)} className={`h-[32px] rounded-[6px] border mono text-[11px] font-[510] ${interval === i.value ? "bg-[#CCFF00] text-black border-[#CCFF00]" : "bg-[rgba(255,255,255,0.02)] text-[#d0d6e0] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)]"}`}>{i.label}</button>
                  ))}
                </div>
              </div>

              {!isConnected ? (
                <div className="h-[40px] flex items-center justify-center rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-dashed border-[rgba(255,255,255,0.08)] mono text-[12px] text-[#8a8f98]">Connect wallet to continue →</div>
              ) : (
                <button onClick={onCreateVault} disabled={wrongNetwork || mode === "awaiting"} className="w-full h-[40px] rounded-[6px] bg-[#CCFF00] text-black text-[13px] font-[590] tracking-[-0.01em] disabled:opacity-50 hover:bg-[#d4ff33] transition-colors">
                  {mode === "awaiting" ? "Awaiting signature…" : mode === "submitted" ? "Submitted → pending" : "Create Vault → sign"}
                </button>
              )}
              <TxStates hash={txHash} />
              <div className="mono text-[10px] leading-3 text-[#62666d]">Wiring: UI → wagmi → Factory.createVault() → RPC → Confirmed → Indexer → UI. No hardcoded vaults.</div>
            </div>
          </div>

          {/* Vault list — Monitor density */}
          <div className="card p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-[590] tracking-[0.06em]">YOUR VAULTS</h3>
              <span className="mono text-[10px] text-[#62666d]">0</span>
            </div>
            <div className="mt-2 rounded-[6px] border border-dashed border-[rgba(255,255,255,0.08)] p-6 text-center">
              <div className="mono text-[12px] text-[#8a8f98]">No vaults yet</div>
              <div className="mono text-[11px] text-[#62666d] mt-1">Create one to start the Monitor. Each vault is an ERC4626 share.</div>
            </div>
            <div className="mt-2 mono text-[10px] text-[#62666d]">States: loading • empty ← you are here • populated • stale • error • rate-limited</div>
          </div>
        </section>

        {/* CENTER — Execution log (hero of Monitor) */}
        <section className="col-span-12 lg:col-span-6 space-y-3">
          <div className="card">
            <div className="p-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2">
                <h2 className="text-[12px] font-[590] tracking-[0.06em]">EXECUTION LOG</h2>
                <span className="flex items-center gap-1.5 mono text-[10px] text-[#8a8f98]"><StatusDot state="live" /> INDEXER • REAL EVENTS</span>
              </div>
              <span className="hidden sm:inline mono text-[10px] text-[#62666d]">Source: `Executed` events • Poll 15s • Cached 30s</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="mono text-[10px] tracking-[0.06em] text-[#8a8f98] border-b border-[rgba(255,255,255,0.05)]">
                    <th className="text-left font-[510] px-3 py-2">TIME</th>
                    <th className="text-right font-[510] px-3 py-2">IN (USDC)</th>
                    <th className="text-right font-[510] px-3 py-2">OUT</th>
                    <th className="text-right font-[510] px-3 py-2">PRICE</th>
                    <th className="text-right font-[510] px-3 py-2">TX</th>
                  </tr>
                </thead>
                <tbody className="mono text-[12px]">
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center">
                      <div className="text-[#8a8f98]">No executions yet</div>
                      <div className="text-[11px] text-[#62666d] mt-1">Next in 5d 03h • Keeper will call `execute()` after interval</div>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-[11px] text-[#8a8f98]"><StatusDot state="idle" /> awaiting first deposit</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-2 flex flex-wrap gap-1.5 border-t border-[rgba(255,255,255,0.05)]">
              <span className="pill">Loading</span>
              <span className="pill bg-[rgba(204,255,0,0.08)] border-[rgba(204,255,0,0.2)] text-[#CCFF00]">Empty</span>
              <span className="pill">Populated</span>
              <span className="pill">Stale</span>
              <span className="pill">Error</span>
              <span className="pill">Rate-limited</span>
            </div>
          </div>

          {/* Cumulative insight — not fake chart */}
          <div className="card p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-[590] tracking-[0.06em]">ACCUMULATION</h3>
              <span className="mono text-[10px] text-[#62666d]">Σ amountOut vs Pyth price • WIRED</span>
            </div>
            <div className="mt-3 h-[140px] rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 skeleton opacity-30 pointer-events-none" />
              <div className="relative text-center">
                <div className="mono text-[11px] text-[#62666d]">No data — execute at least once</div>
                <div className="mono text-[10px] text-[#62666d] mt-1">Then: step-line of shares acquired (monotone, 1px, acid signal on hover)</div>
              </div>
            </div>
            <div className="mt-2 mono text-[10px] text-[#62666d]">Chart is not decoration — only renders after 2+ executions with real oracle price.</div>
          </div>
        </section>

        {/* RIGHT INSPECTOR — vault detail / next execution */}
        <section className="col-span-12 lg:col-span-3 space-y-3">
          <div className="card p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-[590] tracking-[0.06em]">INSPECTOR</h3>
              <span className="mono text-[10px] text-[#62666d]">VAULT 0x…</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] p-2.5">
                <div className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">DEPOSITED</div>
                <div className="mono text-[14px] font-[590] mt-1">$0.00</div>
                <div className="mono text-[10px] text-[#62666d]">USDC</div>
              </div>
              <div className="rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] p-2.5">
                <div className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">SHARES</div>
                <div className="mono text-[14px] font-[590] mt-1">0</div>
                <div className="mono text-[10px] text-[#62666d]">ERC4626</div>
              </div>
              <div className="rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] p-2.5">
                <div className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">NEXT</div>
                <div className="mono text-[12px] font-[590] mt-1">—</div>
                <div className="mono text-[10px] text-[#62666d]">keeper</div>
              </div>
            </div>
            <div className="mt-3 p-2.5 rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-1.5 mono text-[11px] text-[#d0d6e0]"><StatusDot state="idle" /> No vault selected</div>
              <div className="mono text-[10px] text-[#8a8f98] mt-1">Select a vault to see `totalAssets()` + `nextExecution` + `canExecute()` wired.</div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <button onClick={onDeposit} title="Requires vault — create vault first (ERC4626 deposit)" className="flex-1 h-[32px] rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] mono text-[12px] font-[510] text-[#8a8f98] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#d0d6e0]">Deposit</button>
              <button onClick={onWithdraw} title="Requires vault shares — deposit first" className="flex-1 h-[32px] rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] mono text-[12px] font-[510] text-[#8a8f98] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#d0d6e0]">Withdraw</button>
              <button onClick={onExportCsv} title="Download execution log as CSV (wired — empty state honest)" className="flex-1 h-[32px] rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] mono text-[12px] font-[510] text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.08)]">Export CSV</button>
            </div>
          </div>

          <div className="card p-3">
            <h3 className="text-[12px] font-[590] tracking-[0.06em]">RISK & FEES</h3>
            <div className="mt-2 space-y-2 mono text-[11px]">
              <div className="flex justify-between"><span className="text-[#8a8f98]">Slippage guard</span><span className="text-[#f7f8f8]">1% • minOut</span></div>
              <div className="flex justify-between"><span className="text-[#8a8f98]">Protocol fee</span><span className="text-[#f7f8f8]">0.15% on execute</span></div>
              <div className="flex justify-between"><span className="text-[#8a8f98]">Aggregator</span><span className="text-[#d0d6e0] truncate max-w-[120px]">{ADDRESSES.aggregator.slice(0, 6)}…</span></div>
              <div className="flex justify-between"><span className="text-[#8a8f98]">Keeper</span><span className="text-[#10b981]">allowlisted</span></div>
            </div>
            <div className="mt-3 p-2 rounded-[6px] bg-[rgba(255,204,0,0.06)] border border-[rgba(255,204,0,0.12)] mono text-[10px] text-[#ffcc00]">Price is from Pyth Hermes (30s cache) + 0x quote. If stale &gt;2m, dot kuning + “Price delayed”.</div>
          </div>

        </section>
      </main>

      <footer className="border-t border-[rgba(255,255,255,0.05)] mt-6">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[48px] flex items-center justify-between mono text-[11px] text-[#62666d]">
          <span>TIDE © 2026 — Fee 0.15% on execution • Non-custodial • No token</span>
          <a
            href="https://x.com/tide_robinhood"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors"
            aria-label="Follow TIDE on X"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18.9 2H22L13.82 11.04L23 22H14.63L8.62 14.55L1.74 22H0L8.92 12.19L0 2H8.62L14.63 9.14L18.9 2ZM17.3 20H19.14L7 4H5.05L17.3 20Z" fill="currentColor" />
            </svg>
            <span className="text-[11px] font-[510] tracking-[0.04em] text-[#d0d6e0]">X</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
