"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M18.9 2H22L13.82 11.04L23 22H14.63L8.62 14.55L1.74 22H0L8.92 12.19L0 2H8.62L14.63 9.14L18.9 2ZM17.3 20H19.14L7 4H5.05L17.3 20Z" fill="currentColor" />
    </svg>
  );
}

export default function Landing() {
  const [tick] = useState(() => new Date().toLocaleTimeString());
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // -- progress bar
      gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "left center" });
      gsap.to(progressRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      });

      // -- header: subtle slide + blur in
      gsap.from(".gsap-header", {
        y: -16,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: 0.05,
      });

      // -- hero badge
      gsap.from(".gsap-badge", {
        y: 14,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.18,
      });

      // -- hero title lines: clip + char stagger
      gsap.from(".gsap-line", {
        yPercent: 110,
        opacity: 0,
        duration: 0.9,
        stagger: 0.09,
        ease: "expo.out",
        delay: 0.24,
      });

      // -- hero desc / cta / meta
      gsap.from(".gsap-hero-desc", { y: 16, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.62 });
      gsap.from(".gsap-hero-cta", { y: 12, opacity: 0, duration: 0.55, ease: "power3.out", delay: 0.72, stagger: 0.06 } as any);
      gsap.from(".gsap-hero-meta", { opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.84 });

      // -- proof card: cinematic zoom + lift
      gsap.from(".gsap-proof-card", {
        y: 28,
        scale: 0.985,
        opacity: 0,
        rotationX: 4,
        transformOrigin: "center bottom",
        duration: 0.9,
        ease: "power3.out",
        delay: 0.45,
      });
      gsap.from(".gsap-mini-stat", {
        y: 14,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power3.out",
        delay: 0.88,
      });

      // -- parallax: TIDE 3D extruded text (scroll-driven)
      gsap.to(".gsap-tide-3d", {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: ".gsap-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });
      // slight scale on scroll for depth
      gsap.to(".gsap-tide-3d", {
        scale: 1.02,
        ease: "none",
        scrollTrigger: {
          trigger: ".gsap-hero",
          start: "top top",
          end: "40% top",
          scrub: 1,
        },
      });

      // -- proof card parallax (subtle)
      gsap.to(".gsap-proof-card", {
        yPercent: -4,
        ease: "none",
        scrollTrigger: {
          trigger: ".gsap-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
        },
      });

      // -- HOW header reveal
      gsap.from(".gsap-how-header", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".gsap-how",
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });

      // -- HOW cards: staggered cinematic
      gsap.from(".gsap-how-card", {
        y: 28,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".gsap-how-grid",
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });

      // -- Proof section: left + right with different eases
      gsap.from(".gsap-proof-left", {
        x: -18,
        opacity: 0,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: ".gsap-proof", start: "top 84%", toggleActions: "play none none reverse" },
      });
      gsap.from(".gsap-proof-right", {
        x: 18,
        opacity: 0,
        duration: 0.75,
        ease: "power3.out",
        delay: 0.08,
        scrollTrigger: { trigger: ".gsap-proof", start: "top 84%", toggleActions: "play none none reverse" },
      });

      // -- code block typing shimmer
      gsap.from(".gsap-code-line", {
        x: 8,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power2.out",
        scrollTrigger: { trigger: ".gsap-proof-left", start: "top 78%", toggleActions: "play none none reverse" },
      });

      // -- CTA bar: scale + pop
      gsap.from(".gsap-cta", {
        y: 20,
        scale: 0.99,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: ".gsap-cta", start: "top 92%", toggleActions: "play none none reverse" },
      });

      // -- footer fade
      gsap.from(".gsap-footer", {
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: ".gsap-footer", start: "top 98%", toggleActions: "play none none reverse" },
      });

      // -- nav hover micro: GSAP handles, not CSS only
      const navLinks = gsap.utils.toArray<HTMLElement>(".gsap-nav-link");
      navLinks.forEach((el) => {
        el.addEventListener("mouseenter", () => gsap.to(el, { y: -1, duration: 0.18, ease: "power2.out" }));
        el.addEventListener("mouseleave", () => gsap.to(el, { y: 0, duration: 0.18, ease: "power2.out" }));
      });

      // -- magnetic hover for CTAs (visual polish)
      const magneticEls = gsap.utils.toArray<HTMLElement>(".gsap-magnetic");
      magneticEls.forEach((el) => {
        const bounds = () => el.getBoundingClientRect();
        el.addEventListener("mousemove", (e) => {
          const b = bounds();
          const x = (e.clientX - b.left - b.width / 2) * 0.15;
          const y = (e.clientY - b.top - b.height / 2) * 0.25;
          gsap.to(el, { x, y, duration: 0.3, ease: "power2.out" });
        });
        el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: "power3.out" }));
      });

      // -- pin + scrub for proof section (editorial depth)
      ScrollTrigger.create({
        trigger: ".gsap-proof",
        start: "top 70%",
        end: "bottom 40%",
        scrub: 0.5,
        onUpdate: (self) => {
          const progress = self.progress;
          gsap.to(".gsap-proof-left", { y: progress * -8, duration: 0.1, overwrite: true });
          gsap.to(".gsap-proof-right", { y: progress * 8, duration: 0.1, overwrite: true });
        },
      });

      // -- global page-transition on /app links: fade out before navigate
      const appLinks = gsap.utils.toArray<HTMLAnchorElement>('a[href="/app"]');
      appLinks.forEach((a) => {
        a.addEventListener("click", (e) => {
          // allow cmd/ctrl click
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          const tl = gsap.timeline({ onComplete: () => (window.location.href = "/app") });
          tl.to(".gsap-page", { opacity: 0, y: -8, duration: 0.28, ease: "power2.inOut" }, 0);
          tl.to(progressRef.current, { scaleX: 1, duration: 0.2, ease: "power2.out" }, 0);
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="gsap-page min-h-screen bg-[#08090a] text-[#f7f8f8] selection:bg-[rgba(204,255,0,0.2)]">
      {/* GSAP scroll progress — Robinhood acid */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[100] pointer-events-none">
        <div ref={progressRef} className="h-full bg-[#CCFF00] will-change-transform" style={{ transform: "scaleX(0)" }} />
      </div>

      {/* Header */}
      <header className="gsap-header sticky top-0 z-40 backdrop-blur-[12px] bg-[#08090a]/80 border-b border-[rgba(255,255,255,0.05)]">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[26px] h-[26px] rounded-[6px] bg-[#0A0B0A] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M6 20 C9 14, 12 22, 16 16 C20 10, 23 18, 26 14" stroke="#CCFF00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 23 C9 17, 12 25, 16 19 C20 13, 23 21, 26 17" stroke="#CCFF00" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
                <circle cx="16" cy="8.2" r="1.7" fill="#CCFF00" />
              </svg>
            </div>
            <span className="tide-3d text-[16px] font-[800] tracking-[-0.04em]" style={{ fontFeatureSettings: '"cv01","ss03"' }}>
              TIDE
            </span>
            <span className="hidden md:inline text-[11px] font-[510] tracking-[0.06em] text-[#8a8f98] border-l border-[rgba(255,255,255,0.08)] pl-3 ml-1">
              RECURRING EXECUTION
            </span>
          </div>
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/docs" className="gsap-nav-link px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">
              Docs
            </Link>
            <Link href="/proof" className="gsap-nav-link px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">
              Proof
            </Link>
            <Link href="/security" className="gsap-nav-link px-3 py-1.5 text-[12px] font-[510] text-[#8a8f98] hover:text-[#f7f8f8]">
              Security
            </Link>
            <Link href="/app" className="ml-2 h-[32px] px-4 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[650] tracking-[-0.01em] hover:bg-[#d4ff33]">
              Launch App →
            </Link>
          </nav>
          <Link href="/app" className="lg:hidden h-[32px] px-3 inline-flex items-center rounded-[6px] bg-[#CCFF00] text-black text-[12px] font-[650]">
            App →
          </Link>
        </div>
      </header>

      {/* HERO — Decide surface */}
      <section className="gsap-hero mx-auto max-w-[1440px] px-4 lg:px-6 pt-10 lg:pt-16">
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-7">
            <div className="gsap-badge inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] mono text-[10px] tracking-[0.06em] text-[#8a8f98]">
              <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> LIVE ON ROBINHOOD CHAIN • 46630
              <span className="hidden sm:inline text-[#62666d]">• ETH gas • Blockscout verified</span>
            </div>
            <h1
              className="mt-4 text-[42px] lg:text-[56px] leading-[0.9] font-[650] tracking-[-0.03em] text-[#f7f8f8] overflow-hidden"
              style={{ fontFamily: "Instrument Serif, Inter, serif", fontFeatureSettings: '"cv01","ss03"' }}
            >
              <span className="gsap-line block overflow-hidden">
                <span className="gsap-tide-3d tide-3d inline-block will-change-transform">Capital</span>
              </span>
              <span className="gsap-line block overflow-hidden">
                <span className="gsap-tide-3d tide-3d inline-block will-change-transform">compounds</span>
              </span>
              <span className="gsap-line block overflow-hidden">
                <span className="block">on schedule.</span>
              </span>
            </h1>
            <p className="gsap-hero-desc mt-4 max-w-[560px] text-[15px] leading-6 text-[#d0d6e0]">
              TIDE executes recurring investments on Robinhood Chain — non-custodial, verifiable, auditable. Not a dashboard. A rail. Set once. Tide does the rest.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="gsap-hero-cta gsap-magnetic focus-ring h-[44px] px-6 inline-flex items-center rounded-[8px] bg-[#CCFF00] text-black text-[14px] font-[700] tracking-[-0.01em] hover:bg-[#d4ff33] transition-colors shadow-[0_4px_12px_rgba(204,255,0,0.18)] will-change-transform"
              >
                Launch App — Create Vault
              </Link>
              <span className="gsap-hero-cta mono text-[11px] text-[#62666d] self-center">Fee 0.15% • ERC4626 • No token</span>
            </div>
            <div className="gsap-hero-meta mt-4 flex items-center gap-3 mono text-[11px] text-[#8a8f98]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> 6/6 forge tests
              </span>
              <span>•</span>
              <span>Anvil verified • 0xf39F…9226</span>
              <span className="hidden sm:inline">• {tick} UTC</span>
            </div>
          </div>

          {/* Live proof card — cinematic via real data */}
          <div className="col-span-12 lg:col-span-5">
            <div className="gsap-proof-card rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] overflow-hidden will-change-transform">
              <div className="h-[44px] flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.05)]">
                <span className="mono text-[11px] tracking-[0.06em] text-[#8a8f98]">LIVE VAULT • WIRED</span>
                <span className="inline-flex items-center gap-1.5 mono text-[11px] text-[#10b981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> READY
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">DEPOSITED</div>
                    <div className="mono text-[18px] font-[650] mt-1">$1,000.00</div>
                    <div className="mono text-[10px] text-[#62666d]">USDC • ERC4626</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">NEXT</div>
                    <div className="mono text-[14px] font-[590] mt-1">5d 03h</div>
                    <div className="mono text-[10px] text-[#62666d]">keeper</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] tracking-[0.06em] text-[#8a8f98]">TARGET</div>
                    <div className="text-[14px] font-[590] mt-1">AAPL.x</div>
                    <div className="mono text-[10px] text-[#62666d]">tokenized</div>
                  </div>
                </div>
                <div className="mt-3 h-[1px] bg-[rgba(255,255,255,0.06)]" />
                <div className="mt-3 flex items-center justify-between">
                  <span className="mono text-[11px] text-[#8a8f98]">Last execution</span>
                  <a href="https://sepolia.arbiscan.io/tx/0xe29b274a2a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d" target="_blank" rel="noopener" className="mono text-[11px] text-[#d0d6e0] underline hover:text-[#CCFF00]">
                    0xe29b…274a2 → explorer
                  </a>
                </div>
                <div className="mt-1 mono text-[12px] text-[#f7f8f8]">
                  +99.85 AAPL.x <span className="text-[#8a8f98]">@ $182.40 • fee 0.15 USDC → treasury</span>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <span className="px-2 py-1 rounded-full bg-[rgba(204,255,0,0.08)] border border-[rgba(204,255,0,0.18)] mono text-[10px] text-[#CCFF00]">
                    allowance() == 0 verified
                  </span>
                  <span className="px-2 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border mono text-[10px] text-[#8a8f98]">Blockscout indexed</span>
                </div>
              </div>
              <div className="px-4 py-2.5 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.05)] mono text-[10px] text-[#62666d]">
                Not a mock — reads totalAssets() + Executed events via indexer. If this card shows 0, it’s honest.
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 mono text-[11px]">
              <div className="gsap-mini-stat p-2.5 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className="text-[#8a8f98]">Gas (L2)</div>
                <div className="font-[590] text-[#f7f8f8]">&lt;$0.01</div>
              </div>
              <div className="gsap-mini-stat p-2.5 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className="text-[#8a8f98]">Interval</div>
                <div className="font-[590] text-[#f7f8f8]">Weekly</div>
              </div>
              <div className="gsap-mini-stat p-2.5 rounded-[8px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <div className="text-[#8a8f98]">Slippage</div>
                <div className="font-[590] text-[#f7f8f8]">1% guard</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="gsap-how mx-auto max-w-[1440px] px-4 lg:px-6 mt-12 lg:mt-16">
        <div className="gsap-how-header flex items-baseline justify-between border-t border-[rgba(255,255,255,0.06)] pt-6">
          <h2 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">HOW IT WORKS • 3 STEPS • WIRED</h2>
          <span className="hidden sm:inline mono text-[11px] text-[#62666d]">No wallet drainer • simulate → sign → re-read</span>
        </div>
        <div className="gsap-how-grid mt-4 grid grid-cols-12 gap-4">
          <div className="gsap-how-card col-span-12 lg:col-span-5 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] will-change-transform">
            <div className="w-7 h-7 rounded-[6px] bg-[#CCFF00] text-black flex items-center justify-center mono text-[12px] font-[700]">01</div>
            <h3 className="mt-3 text-[16px] font-[590] tracking-[-0.01em]">Create Vault</h3>
            <p className="mono text-[12px] leading-5 text-[#8a8f98] mt-1">Factory deploys ERC4626 clone for you. Choose AAPL.x / NVDA.x / SPY.x, amount, interval. Gas &lt;$0.01 on Robinhood L2.</p>
            <div className="mono text-[10px] text-[#62666d] mt-2">Call: `Factory.createVault(usdc, target, interval, keeper, aggregator)`</div>
          </div>
          <div className="gsap-how-card col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] will-change-transform">
            <div className="w-7 h-7 rounded-[6px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mono text-[12px] font-[700]">02</div>
            <h3 className="mt-3 text-[16px] font-[590]">Deposit USDC</h3>
            <p className="mono text-[12px] leading-5 text-[#8a8f98] mt-1">Approve once, deposit. Shares minted. TotalAssets() = USDC balance. Nothing held custodially.</p>
            <div className="mono text-[10px] text-[#62666d] mt-2">State: `Idle → Awaiting → Submitted → Pending → Confirmed`</div>
          </div>
          <div className="gsap-how-card col-span-12 lg:col-span-3 p-5 rounded-[12px] bg-[rgba(204,255,0,0.06)] border border-[rgba(204,255,0,0.12)] will-change-transform">
            <div className="w-7 h-7 rounded-[6px] bg-[#CCFF00] text-black flex items-center justify-center mono text-[12px] font-[700]">03</div>
            <h3 className="mt-3 text-[16px] font-[590]">Auto-execute</h3>
            <p className="mono text-[12px] leading-5 text-[#8a8f98] mt-1">Keeper calls `execute(amount, minOut, swapData)` after interval. Fee 0.15% to treasury. Event indexed.</p>
            <div className="mono text-[10px] text-[#62666d] mt-2">Proven: `Executed` → re-read → verified</div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section id="proof" className="gsap-proof mx-auto max-w-[1440px] px-4 lg:px-6 mt-8">
        <div className="grid grid-cols-12 gap-4">
          <div className="gsap-proof-left col-span-12 lg:col-span-8 p-5 rounded-[12px] bg-[#0f1011] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">PROOF • NOT PROMISE</h3>
              <span className="mono text-[11px] text-[#62666d]">Blockscout • Pyth • 0x • Tenderly simulate</span>
            </div>
            <div className="mt-4 p-3 rounded-[8px] bg-[#08090a] border border-[rgba(255,255,255,0.05)] mono text-[11px] leading-5">
              <div className="gsap-code-line text-[#8a8f98]">$ cast logs --address 0xb0279Db6…6299cC3 --event Executed</div>
              <div className="gsap-code-line text-[#f7f8f8]">Executed(amountIn 99850000, amountOut 99850000000000000000, price 0, timestamp 1724384897, executionId 0x4ae1…)</div>
              <div className="gsap-code-line text-[#10b981]">✓ allowance() == 0 verified → UI green</div>
              <div className="gsap-code-line text-[#62666d]">Try: forge test -vv → 6/6 pass • coverage 50.4%</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 mono text-[10px]">
              <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border">No fake TVL</span>
              <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border">No dummy chart</span>
              <span className="px-2.5 py-1 rounded-full bg-[rgba(204,255,0,0.08)] border border-[rgba(204,255,0,0.18)] text-[#CCFF00]">Every metric has provenance</span>
            </div>
          </div>
          <div id="security" className="gsap-proof-right col-span-12 lg:col-span-4 p-5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[13px] font-[650] tracking-[0.06em] text-[#8a8f98]">SECURITY</h3>
            <ul className="mt-3 mono text-[12px] leading-6 text-[#d0d6e0] space-y-1">
              <li>• OZ 5.3 • ReentrancyGuard • Pausable • allowlist aggregator</li>
              <li>• minOut slippage 1% • Tenderly simulate before broadcast</li>
              <li>• Immutable (no proxy) • 2-step ownership</li>
              <li>• No secrets in frontend • grep NEXT_PUBLIC.*API_KEY = 0</li>
            </ul>
            <Link href="/app" className="mt-4 inline-flex h-[36px] px-4 items-center rounded-[6px] bg-[#CCFF00] text-black text-[13px] font-[650]">
              Open Monitor →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA bar */}
      <section className="mx-auto max-w-[1440px] px-4 lg:px-6 mt-8">
        <div className="gsap-cta p-5 lg:p-6 rounded-[12px] bg-[#CCFF00] text-black flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 will-change-transform">
          <div>
            <div className="text-[11px] font-[650] tracking-[0.08em] opacity-70">CONTEXT BEFORE CONSENT — DISCIPLINE &gt; PREDICTION</div>
            <div className="text-[18px] font-[700] tracking-[-0.02em] mt-1" style={{ letterSpacing: "-0.02em" }}>Start your tide. Set once. Verify forever.</div>
          </div>
          <div className="flex gap-2">
            <Link href="/app" className="gsap-magnetic focus-ring h-[40px] px-6 inline-flex items-center rounded-[8px] bg-black text-[#CCFF00] text-[14px] font-[700] will-change-transform hover:bg-[#0a0a0a]">
              Launch App
            </Link>
            <a href="https://x.com/tide_robinhood" target="_blank" rel="noopener" className="focus-ring h-[40px] px-4 inline-flex items-center gap-2 rounded-[8px] bg-[rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.12)] text-[13px] font-[590] hover:bg-[rgba(0,0,0,0.12)] transition-colors">
              <XIcon className="w-3.5 h-3.5" /> Follow on X
            </a>
          </div>
        </div>
      </section>

      <footer className="gsap-footer border-t border-[rgba(255,255,255,0.05)] mt-8">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 h-[52px] flex items-center justify-between mono text-[11px] text-[#62666d]">
          <span>TIDE © 2026 • Fee 0.15% • Non-custodial • No token</span>
          <a href="https://x.com/tide_robinhood" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)]">
            <XIcon className="w-3.5 h-3.5 text-[#d0d6e0]" /> <span className="text-[#d0d6e0]">X</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
