import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

/**
 * Two families, both variable, both committed to the repository.
 *
 * Archivo carries a width axis (62–125), which is what lets the display type sit
 * at the wordmark's proportion without a second display family — the wordmark is
 * a wide geometric, and matching it with tracking alone always looks like a
 * compromise. JetBrains Mono handles every figure, hash and address.
 *
 * They are local rather than `next/font/google` on purpose. Google Fonts is a
 * build-time network dependency: when it is slow or blocked, the *build* fails,
 * not just the font. Vendoring two latin-subset woff2 files (90KB + 40KB) makes
 * the build hermetic and removes a third-party request from the critical path.
 * `next/font/local` still gives preloading, `display: swap` and a size-adjusted
 * fallback, so there is no layout shift when the face arrives.
 *
 * The previous build pulled three families over `@import url(fonts.googleapis…)`
 * inside CSS, which blocks first paint on a third-party round trip.
 */
const archivo = localFont({
  src: "./fonts/archivo-variable.woff2",
  variable: "--font-archivo",
  display: "swap",
  weight: "100 900",
  style: "normal",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial"],
  adjustFontFallback: "Arial",
});

const mono = localFont({
  src: "./fonts/jetbrains-mono-variable.woff2",
  variable: "--font-mono-jb",
  display: "swap",
  weight: "100 800",
  style: "normal",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tide.exchange";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "TIDE — Capital, on tide.",
    template: "%s — TIDE",
  },
  description:
    "Recurring execution for tokenized equities on Robinhood Chain. You set the cadence and the price you will pay; the vault does the rest, on-chain and non-custodial.",
  applicationName: "TIDE",
  openGraph: {
    title: "TIDE — Capital, on tide.",
    description:
      "Recurring execution for tokenized equities on Robinhood Chain. Non-custodial, price-guarded, verifiable.",
    url: APP_URL,
    siteName: "TIDE",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "TIDE", description: "Capital, on tide." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        {/* Skip link: the dashboard has a long header rail and a keyboard user
            should not have to tab through it to reach the data. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-signal focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-signal-ink"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
