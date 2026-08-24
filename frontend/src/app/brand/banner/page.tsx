import type { Metadata } from "next";
import { Wordmark } from "@/components/identity/Wordmark";
import { CapitalFlow } from "@/components/tide/CapitalFlow";

/**
 * Brand export surface.
 *
 * A 1500×500 composition of the signature — the same component the hero uses,
 * not a redrawn copy — so the banner can never drift from the product. Screenshot
 * `#banner` at device scale 2 for a 3000×1000 asset.
 *
 * Not linked from anywhere and excluded from indexing: it is a tool, not a page.
 */
export const metadata: Metadata = {
  title: "TIDE — brand export",
  robots: { index: false, follow: false },
};

export default function BannerExport() {
  return (
    <main className="min-h-dvh bg-ground p-8">
      <div
        id="banner"
        className="relative flex flex-col justify-between overflow-hidden bg-ground"
        style={{ width: 1500, height: 500 }}
      >
        <div className="flex items-start justify-between px-14 pt-9">
          <div>
            <Wordmark className="h-8 w-auto text-hi" />
            <p className="t-eyebrow mt-4 text-dim">Recurring execution protocol · Robinhood Chain</p>
          </div>
          <div className="max-w-[30ch] text-right">
            <p className="text-[22px] leading-[1.25] text-hi">Capital, on tide.</p>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-low">
              Set the cadence. Capital follows.
            </p>
          </div>
        </div>

        {/* The signature, cropped to its trajectory band so the banner reads as
            one continuous line rather than a shrunken diagram. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          {/* Shifted clear of the avatar X stamps over the banner's lower-left. */}
          <div style={{ width: 1300, marginLeft: 165 }}>
            <CapitalFlow autoplay={false} caption={false} active="execution" />
          </div>
        </div>
      </div>
    </main>
  );
}
