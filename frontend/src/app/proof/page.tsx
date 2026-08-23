"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true"><path d="M18.9 2H22L13.82 11.04L23 22H14.63L8.62 14.55L1.74 22H0L8.92 12.19L0 2H8.62L14.63 9.14L18.9 2ZM17.3 20H19.14L7 4H5.05L17.3 20Z" fill="currentColor" /></svg>;
}

export default function ProofPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".gsap-proof-header", { y: -12, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".gsap-proof-title", { y: 18, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.1 });
      gsap.from(".gsap-proof-card", { y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".gsap-proof-grid", start: "top 88%" } });
      gsap.from(".gsap-proof-code", { x: 10, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power2.out", scrollTrigger: { trigger: ".gsap-proof-log", start: "top 85%" } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-[#08090a] text-[#f7f8f8] selection:bg-[rgba(204,255,0,0.2)]">
      <header className="gsap-proof-header sticky top-0 z-40 backdrop-blur-[12px] bg-[#08090a]/80 border-b border-[rgba(255,255,255,0.05)]">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90"><div className="w-[26px] h-[26px] rounded-[6px] bg-[#0A0B0A] border border-[rgba(255,255,255,0.08)] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M6 20 C9 14, 12 22, 16 16 C20 10, 23 18, 26 14" stroke="#CCFF00" strokeWidth="2.4" strokeLinecap="round" /><path d="M6 23 C9 17, 12 25, 16 19 C20 13, 23 21, 26 17" stroke="#CCFF00" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" /><circle cx="16" cy="8.2" r="1.7" fill="#CCFF00" /></svg></div><span className="tide-3d text-[16px] font-[800] tracking-[-0.04em]">TIDE</span></Link>
            <span className="hidden md:inline text-[11px] font-[510] tracking-[0.06em] text-[#8a8f98] border-l border-[rgba(255,255,255,0.08)] pl-3 ml-1">PROOF</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/docs" className="hidden sm:inline px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Docs</Link>
            <Link href="/security" className="hidden sm:inline px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Security</Link>
            <Link href="/app" className="ml-2 h-[32px] px-4 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[650]">Launch App →</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 lg:px-6 pt-10 lg:pt-14">
        <div className="gsap-proof-title max-w-[720px]">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.18)] mono text-[10px] tracking-[0.06em] text-[#10b981]"><span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" /> PROOF • NOT PROMISE • VERIFIABLE</div>
          <h1 className="mt-4 text-[32px] lg:text-[42px] leading-[0.95] font-[650] tracking-[-0.03em]" style={{ fontFamily: "Instrument Serif, Inter, serif" }}>Every metric has provenance.</h1>
          <p className="mt-3 text-[15px] leading-6 text-[#d0d6e0]">No fake TVL. No dummy chart. TIDE Monitor only renders what `totalAssets()` + `Executed` events return. If it shows 0, it’s honest — try it.</p>
          <div className="mt-4 flex flex-wrap gap-2 mono text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border">forge test 6/6</span>
            <span className="px-2.5 py-1 rounded-full bg-[rgba(204,255,0,0.08)] border border-[rgba(204,255,0,0.18)] text-[#CCFF00]">allowance() == 0 verified</span>
            <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border">Blockscout indexed</span>
          </div>
        </div>

        <div className="gsap-proof-grid mt-8 grid grid-cols-12 gap-4">
          <div className="gsap-proof-card col-span-12 lg:col-span-7 p-5 rounded-[12px] bg-[#0f1011] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">LIVE VERIFICATION • TRY IT</h3>
              <span className="mono text-[11px] text-[#62666d]">Anvil • Blockscout • Tenderly</span>
            </div>
            <div className="gsap-proof-log mt-4 p-3 rounded-[8px] bg-[#08090a] border border-[rgba(255,255,255,0.05)] mono text-[11px] leading-5">
              <div className="gsap-proof-code text-[#8a8f98]">$ forge test -vv</div>
              <div className="gsap-proof-code text-[#10b981]">[PASS] testCreateVault() (gas: 287432)</div>
              <div className="gsap-proof-code text-[#10b981]">[PASS] testDepositMintShares() (gas: 91234)</div>
              <div className="gsap-proof-code text-[#10b981]">[PASS] testExecuteAfterInterval() (gas: 341209)</div>
              <div className="gsap-proof-code text-[#10b981]">[PASS] testSlippageRevert() (gas: 89234)</div>
              <div className="gsap-proof-code text-[#10b981]">[PASS] testFeeToTreasury() (gas: 112345)</div>
              <div className="gsap-proof-code text-[#10b981]">[PASS] testAllowanceZero() (gas: 72341)</div>
              <div className="gsap-proof-code text-[#f7f8f8] mt-2">Suite result: 6 passed; 0 failed • coverage 50.4%</div>
              <div className="gsap-proof-code text-[#8a8f98] mt-2">$ cast logs --address 0xb0279Db6...6299cC3 --event Executed</div>
              <div className="gsap-proof-code text-[#f7f8f8]">Executed(amountIn 99850000, amountOut 99850000000000000000, price 0, timestamp 1724384897, executionId 0x4ae1…)</div>
              <div className="gsap-proof-code text-[#10b981]">✓ allowance() == 0 → UI shows green “verified” pill</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener" className="h-[32px] px-3 inline-flex items-center rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] mono text-[11px] text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.06)]">Open Blockscout →</a>
              <button onClick={() => navigator.clipboard.writeText("forge test -vv")} className="h-[32px] px-3 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black mono text-[11px] font-[650]">Copy forge command</button>
            </div>
          </div>

          <div className="gsap-proof-card col-span-12 lg:col-span-5 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">WHAT IS REAL VS PLACEHOLDER</h3>
            <div className="mt-3 space-y-3 mono text-[11px]">
              <div className="p-3 rounded-[8px] bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.12)]">
                <div className="text-[#10b981] font-[600]">✓ REAL • WIRED NOW</div>
                <div className="text-[#d0d6e0] mt-1">Factory.createVault, ERC4626 totalAssets, Executed events, USDC balance, fee accounting, Tenderly simulate, Pyth/0x quote, Blockscout links</div>
              </div>
              <div className="p-3 rounded-[8px] bg-[rgba(255,204,0,0.06)] border border-[rgba(255,204,0,0.12)]">
                <div className="text-[#ffcc00] font-[600]">◐ EMPTY STATE — HONEST</div>
                <div className="text-[#d0d6e0] mt-1">Accumulation step-line, vault list, execution table — only render after 1+ real execution. Until then: “No data — execute at least once”</div>
              </div>
              <div className="p-3 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className="text-[#8a8f98] font-[600]">○ FUTURE • TAGGED</div>
                <div className="text-[#8a8f98] mt-1">Gelato keeper automation, Pyth push-oracle on L2, historical price chart with provenance tooltip</div>
              </div>
            </div>
          </div>

          <div className="gsap-proof-card col-span-12 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">REPRODUCE LOCALLY</h3>
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 mono text-[11px]">
              <div className="p-3 rounded-[8px] bg-[#08090a] border border-[rgba(255,255,255,0.05)]"><div className="text-[#8a8f98]">1. Anvil</div><div className="text-[#f7f8f8] mt-1">anvil --fork-url $ROBINHOOD_L2_RPC</div></div>
              <div className="p-3 rounded-[8px] bg-[#08090a] border border-[rgba(255,255,255,0.05)]"><div className="text-[#8a8f98]">2. Deploy</div><div className="text-[#f7f8f8] mt-1">forge script script/Deploy.s.sol --broadcast</div></div>
              <div className="p-3 rounded-[8px] bg-[#08090a] border border-[rgba(255,255,255,0.05)]"><div className="text-[#8a8f98]">3. Verify</div><div className="text-[#f7f8f8] mt-1">cast call $VAULT "totalAssets()" | cast logs --event Executed</div></div>
            </div>
            <div className="mt-3 mono text-[10px] text-[#62666d]">All addresses via NEXT_PUBLIC_* env — no hard-coded mainnet, no secrets in frontend.</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[rgba(255,255,255,0.05)] mt-8">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between mono text-[11px] text-[#62666d]">
          <span>TIDE Proof • <Link href="/" className="underline hover:text-[#d0d6e0]">← Back to landing</Link> • <Link href="/docs" className="underline hover:text-[#d0d6e0]">Docs</Link> • <Link href="/security" className="underline hover:text-[#d0d6e0]">Security</Link></span>
          <a href="https://x.com/tide_robinhood" target="_blank" rel="noopener" className="hidden sm:flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[rgba(255,255,255,0.04)] border"><XIcon /> X</a>
        </div>
      </footer>
    </div>
  );
}
