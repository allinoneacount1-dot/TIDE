"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/identity/Wordmark";
import { Button } from "@/components/primitives/Button";
import { XLogo } from "@/components/identity/XLogo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "#mechanism", label: "Mechanism" },
  { href: "#market", label: "Market" },
  { href: "#guarantees", label: "Guarantees" },
  { href: "/docs", label: "Docs" },
] as const;

export const X_URL = "https://x.com/tidehood";

/**
 * The header does one thing on scroll: it thins.
 *
 * No shrinking logo, no colour flip, no blur that appears at 40px. The rule
 * beneath it goes from invisible to visible, which is the minimum needed to
 * separate it from content once content is behind it.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-ground/85 backdrop-blur-[10px] transition-colors duration-300",
        scrolled ? "border-b border-hairline" : "border-b border-transparent"
      )}
    >
      <div className="shell flex h-14 items-center justify-between gap-6">
        <Link href="/" className="flex min-h-6 items-center gap-3 py-1" aria-label="TIDE home">
          <Wordmark className="h-[18px] w-auto text-hi" />
          <span className="hidden border-l border-rule pl-3 font-mono text-[10px] uppercase tracking-[0.16em] text-dim sm:block">
            Recurring execution
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative px-3 py-2 text-[13px] text-mid transition-colors hover:text-hi"
            >
              {item.label}
              {/* The tide line as the hover affordance, so the signature does
                  navigational work rather than sitting there being a texture. */}
              <span className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-signal transition-transform duration-200 group-hover:scale-x-100" />
            </Link>
          ))}
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TIDE on X"
            className="ml-1 inline-flex size-8 items-center justify-center text-low transition-colors hover:text-hi"
          >
            <XLogo />
          </a>
          <Link href="/app" className="ml-1">
            <Button variant="primary" size="sm">
              Launch TIDE
            </Button>
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TIDE on X"
            className="inline-flex size-8 items-center justify-center text-low transition-colors hover:text-hi"
          >
            <XLogo />
          </a>
          <Link href="/app">
            <Button variant="primary" size="sm">
              Launch
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="mobile-nav"
            aria-label="Menu"
            className="inline-flex size-8 items-center justify-center text-mid"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
              <path
                d={menu ? "M3 3l10 10M13 3L3 13" : "M1 4.5h14M1 11.5h14"}
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </button>
        </div>
      </div>

      {menu ? (
        <nav id="mobile-nav" className="shell border-t border-hairline py-2 md:hidden" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenu(false)}
              className="block border-b border-hairline/60 py-3 text-[14px] text-mid"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-3 text-[14px] text-mid"
          >
            <XLogo className="size-3.5" /> Follow on X
          </a>
        </nav>
      ) : null}
    </header>
  );
}
