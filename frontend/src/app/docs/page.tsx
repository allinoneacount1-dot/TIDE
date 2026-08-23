"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true"><path d="M18.9 2H22L13.82 11.04L23 22H14.63L8.62 14.55L1.74 22H0L8.92 12.19L0 2H8.62L14.63 9.14L18.9 2ZM17.3 20H19.14L7 4H5.05L17.3 20Z" fill="currentColor" /></svg>;
}

export default function DocsPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".gsap-doc-header", { y: -12, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".gsap-doc-title", { y: 18, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.1 });
      gsap.from(".gsap-doc-card", { y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".gsap-doc-grid", start: "top 88%" } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-[#08090a] text-[#f7f8f8] selection:bg-[rgba(204,255,0,0.2)]">
      <header className="gsap-doc-header sticky top-0 z-40 backdrop-blur-[12px] bg-[#08090a]/80 border-b border-[rgba(255,255,255,0.05)]">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90">
              <div className="w-[26px] h-[26px] rounded-[6px] bg-[#0A0B0A] border border-[rgba(255,255,255,0.08)] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M6 20 C9 14, 12 22, 16 16 C20 10, 23 18, 26 14" stroke="#CCFF00" strokeWidth="2.4" strokeLinecap="round" /><path d="M6 23 C9 17, 12 25, 16 19 C20 13, 23 21, 26 17" stroke="#CCFF00" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" /><circle cx="16" cy="8.2" r="1.7" fill="#CCFF00" /></svg></div>
              <span className="tide-3d text-[16px] font-[800] tracking-[-0.04em]">TIDE</span>
            </Link>
            <span className="hidden md:inline text-[11px] font-[510] tracking-[0.06em] text-[#8a8f98] border-l border-[rgba(255,255,255,0.08)] pl-3 ml-1">DOCS</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/proof" className="hidden sm:inline px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Proof</Link>
            <Link href="/security" className="hidden sm:inline px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Security</Link>
            <Link href="/app" className="ml-2 h-[32px] px-4 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[650]">Launch App →</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 lg:px-6 pt-10 lg:pt-14">
        <div className="gsap-doc-title max-w-[720px]">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] mono text-[10px] tracking-[0.06em] text-[#8a8f98]"><span className="w-2 h-2 rounded-full bg-[#CCFF00]" /> DOCS • WIRED • VERIFIABLE</div>
          <h1 className="mt-4 text-[32px] lg:text-[42px] leading-[0.95] font-[650] tracking-[-0.03em]" style={{ fontFamily: "Instrument Serif, Inter, serif" }}>How TIDE actually works.</h1>
          <p className="mt-3 text-[15px] leading-6 text-[#d0d6e0]">No whitepaper fluff. This is the execution rail: ERC4626 vaults, keeper `execute()`, Pyth + 0x quote, Tenderly simulate, Blockscout index. Every metric has provenance.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app" className="h-[36px] px-4 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[650]">Create Vault →</Link>
            <a href="https://github.com/allinoneacount1-dot/TIDE#readme" target="_blank" rel="noopener" className="h-[36px] px-4 inline-flex items-center rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[12px] font-[510]">GitHub README →</a>
          </div>
        </div>

        <div className="gsap-doc-grid mt-8 grid grid-cols-12 gap-4">
          <div className="gsap-doc-card col-span-12 lg:col-span-6 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">ARCHITECTURE</h3>
            <ul className="mt-3 mono text-[12px] leading-6 text-[#d0d6e0] space-y-1">
              <li>• <span className="text-[#f7f8f8]">Factory</span> deploys minimal-proxy ERC4626 vault per user — isolated USDC accounting</li>
              <li>• <span className="text-[#f7f8f8]">Vault</span> holds USDC, tracks shares, exposes `totalAssets()`, `nextExecution`, `canExecute()`</li>
              <li>• <span className="text-[#f7f8f8]">Keeper</span> (EOA / Gelato) calls `execute(amount, minOut, swapData)` after `interval` — fee `0.15%` → treasury</li>
              <li>• <span className="text-[#f7f8f8]">Aggregator</span> allowlist — only `0x` swapData passes; `minOut` enforces `1%` slippage</li>
              <li>• <span className="text-[#f7f8f8]">Indexer</span> polls `Executed` events every 15s, cached 30s via `useQuery`</li>
            </ul>
            <div className="mt-3 mono text-[10px] text-[#62666d]">Factory.createVault(asset, target, interval, keeper, aggregator) → vault address</div>
          </div>
          <div className="gsap-doc-card col-span-12 lg:col-span-6 p-5 rounded-[12px] bg-[#0f1011] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">FLOW • WIRED END-TO-END</h3>
            <div className="mt-3 mono text-[11px] leading-5 p-3 rounded-[8px] bg-[#08090a] border border-[rgba(255,255,255,0.05)]">
              <div className="text-[#8a8f98]">1. User → Factory.createVault(USDC, AAPL.x, 604800, keeper, aggregator)</div>
              <div className="text-[#f7f8f8]">2. Vault.deposit(100e6, user) — approve() → transferFrom → mint shares</div>
              <div className="text-[#f7f8f8]">3. Keeper waits interval → 0x quote + Pyth price → Tenderly simulate</div>
              <div className="text-[#10b981]">4. Vault.execute(100e6, 99e6, swapData) → DEX swap → +99 AAPL.x, fee 0.15</div>
              <div className="text-[#8a8f98]">5. Event Executed indexed → Monitor re-reads totalAssets() + vault list</div>
            </div>
            <div className="mt-2 mono text-[10px] text-[#62666d]">State: Idle → Awaiting (sign) → Submitted → Pending (receipt) → Confirmed → indexed</div>
          </div>
          <div className="gsap-doc-card col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">CONTRACTS</h3>
            <div className="mt-3 mono text-[11px] leading-5 space-y-1">
              <div className="flex justify-between"><span className="text-[#8a8f98]">VaultFactory</span><span className="text-[#d0d6e0]">immutable, no proxy</span></div>
              <div className="flex justify-between"><span className="text-[#8a8f98]">TideVault ERC4626</span><span className="text-[#d0d6e0]">OZ 5.3, Pausable</span></div>
              <div className="flex justify-between"><span className="text-[#8a8f98]">KeeperRegistry</span><span className="text-[#d0d6e0]">allowlist keeper</span></div>
              <div className="text-[#62666d] mt-2">forge test -vv → 6/6 pass • coverage 50.4%</div>
              <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener" className="inline-flex mt-2 text-[#CCFF00] underline">View verified contracts →</a>
            </div>
          </div>
          <div className="gsap-doc-card col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">DATA SOURCES</h3>
            <ul className="mt-3 mono text-[11px] leading-5 text-[#d0d6e0]">
              <li>• Pyth Hermes — price feed, 30s cache, staleness &gt;2m → yellow dot</li>
              <li>• 0x Swap API — quote for minOut, slippage 1% guard</li>
              <li>• Tenderly — simulate before broadcast, revert reason surfaced</li>
              <li>• Blockscout — Executed events + tx explorer</li>
            </ul>
            <div className="mt-2 mono text-[10px] text-[#62666d]">No NEXT_PUBLIC_API_KEY in frontend — grep = 0</div>
          </div>
          <div className="gsap-doc-card col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(204,255,0,0.06)] border border-[rgba(204,255,0,0.12)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">DEPLOY</h3>
            <div className="mt-3 mono text-[11px] leading-5">
              <div className="text-[#8a8f98]">Chain: Robinhood L2 97468 (testnet) • ETH gas &lt;$0.01</div>
              <div className="text-[#f7f8f8]">Frontend: tide-robinhood.vercel.app — Next 15 + wagmi 2 + RainbowKit</div>
              <div className="text-[#62666d]">Env: NEXT_PUBLIC_VAULT_FACTORY_ADDRESS, USDC, AGGREGATOR, WC_PROJECT_ID, RPC, EXPLORER</div>
            </div>
            <Link href="/app" className="mt-3 inline-flex h-[32px] px-3 items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[590]">Open Monitor →</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[rgba(255,255,255,0.05)] mt-8">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between mono text-[11px] text-[#62666d]">
          <span>TIDE Docs • Non-custodial • Fee 0.15% • <Link href="/" className="underline hover:text-[#d0d6e0]">← Back to landing</Link></span>
          <a href="https://x.com/tide_robinhood" target="_blank" rel="noopener" className="hidden sm:flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[rgba(255,255,255,0.04)] border"><XIcon /> X</a>
        </div>
      </footer>
    </div>
  );
}
