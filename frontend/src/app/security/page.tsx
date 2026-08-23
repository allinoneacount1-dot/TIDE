"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true"><path d="M18.9 2H22L13.82 11.04L23 22H14.63L8.62 14.55L1.74 22H0L8.92 12.19L0 2H8.62L14.63 9.14L18.9 2ZM17.3 20H19.14L7 4H5.05L17.3 20Z" fill="currentColor" /></svg>;
}

export default function SecurityPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".gsap-sec-header", { y: -12, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(".gsap-sec-title", { y: 18, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.1 });
      gsap.from(".gsap-sec-card", { y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".gsap-sec-grid", start: "top 88%" } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-[#08090a] text-[#f7f8f8] selection:bg-[rgba(204,255,0,0.2)]">
      <header className="gsap-sec-header sticky top-0 z-40 backdrop-blur-[12px] bg-[#08090a]/80 border-b border-[rgba(255,255,255,0.05)]">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90"><div className="w-[26px] h-[26px] rounded-[6px] bg-[#0A0B0A] border border-[rgba(255,255,255,0.08)] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M6 20 C9 14, 12 22, 16 16 C20 10, 23 18, 26 14" stroke="#CCFF00" strokeWidth="2.4" strokeLinecap="round" /><path d="M6 23 C9 17, 12 25, 16 19 C20 13, 23 21, 26 17" stroke="#CCFF00" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" /><circle cx="16" cy="8.2" r="1.7" fill="#CCFF00" /></svg></div><span className="tide-3d text-[16px] font-[800] tracking-[-0.04em]">TIDE</span></Link>
            <span className="hidden md:inline text-[11px] font-[510] tracking-[0.06em] text-[#8a8f98] border-l border-[rgba(255,255,255,0.08)] pl-3 ml-1">SECURITY</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/docs" className="hidden sm:inline px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Docs</Link>
            <Link href="/proof" className="hidden sm:inline px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">Proof</Link>
            <Link href="/app" className="ml-2 h-[32px] px-4 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[650]">Launch App →</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 lg:px-6 pt-10 lg:pt-14">
        <div className="gsap-sec-title max-w-[720px]">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgba(255,59,48,0.08)] border border-[rgba(255,59,48,0.18)] mono text-[10px] tracking-[0.06em] text-[#ff3b30]"><span className="w-2 h-2 rounded-full bg-[#ff3b30]" /> SECURITY • AUDITABLE • NON-CUSTODIAL</div>
          <h1 className="mt-4 text-[32px] lg:text-[42px] leading-[0.95] font-[650] tracking-[-0.03em]" style={{ fontFamily: "Instrument Serif, Inter, serif" }}>Your keys, your vault, our invariants.</h1>
          <p className="mt-3 text-[15px] leading-6 text-[#d0d6e0]">TIDE is non-custodial: USDC never leaves your vault contract. No proxy, no upgrade, no secret admin. View the invariants, reproduce them locally.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/proof" className="h-[36px] px-4 inline-flex items-center rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[12px] font-[510]">View Proof →</Link>
            <a href="https://github.com/allinoneacount1-dot/TIDE#security" target="_blank" rel="noopener" className="h-[36px] px-4 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[650]">Security README →</a>
          </div>
        </div>

        <div className="gsap-sec-grid mt-8 grid grid-cols-12 gap-4">
          <div className="gsap-sec-card col-span-12 lg:col-span-6 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">INVARIANTS • ENFORCED ON-CHAIN</h3>
            <ul className="mt-3 mono text-[12px] leading-6 text-[#d0d6e0] space-y-1">
              <li>• <span className="text-[#f7f8f8]">OpenZeppelin 5.3</span> — ReentrancyGuard on `execute()` + `deposit()` / `withdraw()`</li>
              <li>• <span className="text-[#f7f8f8]">Pausable</span> — owner can pause vault/factory on incident; no funds move while paused</li>
              <li>• <span className="text-[#f7f8f8]">Allowlist aggregator</span> — only whitelisted `0x` `swapData` passes; unknown aggregator reverts</li>
              <li>• <span className="text-[#f7f8f8]">minOut slippage 1%</span> — `amountOut &lt; minOut` → revert, funds stay in vault</li>
              <li>• <span className="text-[#f7f8f8]">No proxy / immutable</span> — deployed bytecode is final; no upgradeable proxy</li>
              <li>• <span className="text-[#f7f8f8]">2-step ownership</span> — `transferOwnership` → `acceptOwnership`, prevents fat-finger</li>
            </ul>
            <div className="mt-3 mono text-[10px] text-[#62666d]">Test: testSlippageRevert, testFeeToTreasury, testAllowanceZero — all present in forge suite</div>
          </div>
          <div className="gsap-sec-card col-span-12 lg:col-span-6 p-5 rounded-[12px] bg-[#0f1011] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">THREAT MODEL</h3>
            <div className="mt-3 space-y-2 mono text-[11px]">
              <div className="p-2.5 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"><span className="text-[#f7f8f8]">Wallet drainer</span> — mitigated: <span className="text-[#10b981]">single approve → deposit</span>, no infinite allowance, UI simulates via Tenderly then prompts sign, re-reads state</div>
              <div className="p-2.5 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"><span className="text-[#f7f8f8]">MEV / sandwich</span> — mitigated: minOut = quote * 0.99, allowlist aggregator, deadline check</div>
              <div className="p-2.5 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"><span className="text-[#f7f8f8]">Oracle manipulation</span> — Pyth Hermes 30s cache, staleness &gt;2m → UI yellow “Price delayed”, keeper can skip</div>
              <div className="p-2.5 rounded-[8px] bg-[rgba(255,59,48,0.06)] border border-[rgba(255,59,48,0.12)]"><span className="text-[#ff3b30]">Secrets</span> — audit: <span className="text-[#d0d6e0]">grep NEXT_PUBLIC.*API_KEY = 0</span>, no private key in frontend, WC projectId is public</div>
            </div>
          </div>
          <div className="gsap-sec-card col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">FEES</h3>
            <div className="mt-3 mono text-[11px] leading-5">
              <div className="flex justify-between"><span className="text-[#8a8f98]">Protocol fee</span><span className="text-[#f7f8f8]">0.15% on execute only</span></div>
              <div className="flex justify-between"><span className="text-[#8a8f98]">Deposit / withdraw</span><span className="text-[#10b981]">0%</span></div>
              <div className="flex justify-between"><span className="text-[#8a8f98]">Gas</span><span className="text-[#f7f8f8]">&lt;$0.01 on Robinhood L2</span></div>
              <div className="text-[#62666d] mt-2">Fee goes to treasury — not hidden in swap. View via Executed event + fee transfer log.</div>
            </div>
          </div>
          <div className="gsap-sec-card col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">CUSTODY</h3>
            <ul className="mt-3 mono text-[11px] leading-5 text-[#d0d6e0]">
              <li>• No custodial hot wallet — vault is your contract</li>
              <li>• Shares minted per ERC4626 — `balanceOf(vault)` is source of truth</li>
              <li>• `allowance() == 0` after deposit → UI green pill verified via `readContract`</li>
              <li>• Withdraw anytime — `redeem` / `withdraw` with no timelock</li>
            </ul>
            <Link href="/app" className="mt-3 inline-flex h-[32px] px-3 items-center rounded-[6px] bg-[rgba(255,255,255,0.04)] border mono text-[11px]">Test deposit on testnet →</Link>
          </div>
          <div className="gsap-sec-card col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(204,255,0,0.06)] border border-[rgba(204,255,0,0.12)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">AUDIT TODO</h3>
            <div className="mt-3 mono text-[11px] leading-5 text-[#8a8f98]">
              <div>• External audit: <span className="text-[#ffcc00]">pending — do not mainnet with TVL &gt;$10k</span></div>
              <div>• Formal invariants: forge fuzz + invariant tests (in progress)</div>
              <div>• Bug bounty: to be published post-audit</div>
              <div className="mt-2 text-[#62666d]">Contracts are open source at github.com/allinoneacount1-dot/TIDE — review, fork, verify deploy.</div>
            </div>
            <a href="https://github.com/allinoneacount1-dot/TIDE" target="_blank" rel="noopener" className="mt-3 inline-flex h-[32px] px-3 items-center rounded-[6px] bg-[#CCFF00] text-black text-[11px] font-[590]">View Contracts →</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[rgba(255,255,255,0.05)] mt-8">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between mono text-[11px] text-[#62666d]">
          <span>TIDE Security • <Link href="/" className="underline hover:text-[#d0d6e0]">← Back to landing</Link> • <Link href="/docs" className="underline hover:text-[#d0d6e0]">Docs</Link> • <Link href="/proof" className="underline hover:text-[#d0d6e0]">Proof</Link></span>
          <a href="https://x.com/tide_robinhood" target="_blank" rel="noopener" className="hidden sm:flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[rgba(255,255,255,0.04)] border"><XIcon /> X</a>
        </div>
      </footer>
    </div>
  );
}
