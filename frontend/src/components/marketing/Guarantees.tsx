"use client";

import { useScene, D, E, STAGGER } from "@/components/motion";

/**
 * Guarantees, framed as refusals.
 *
 * Stated as what the contract *will not do*, because that is the only form of
 * promise a smart contract can actually keep. Each line names the mechanism
 * that enforces it, so a reader can go and check rather than take it on trust.
 *
 * Presented as a definition list on a rule grid. Not six cards with icons — the
 * content is a specification, and a specification reads as a list.
 */
const REFUSALS = [
  {
    refusal: "It will not move your assets.",
    mechanism:
      "Only the vault owner can call withdraw. The keeper's entire authority is to trigger one execution of a plan you configured.",
  },
  {
    refusal: "It will not execute without a price floor.",
    mechanism:
      "A plan needs your limit price, a registry oracle, or both. With neither, canExecute returns Unguarded and execution reverts.",
  },
  {
    refusal: "It will not let the keeper accept a bad fill.",
    mechanism:
      "minOut supplied by the keeper may only tighten the on-chain floor. A compromised keeper passing zero still cannot execute below your guard.",
  },
  {
    refusal: "It will not leave an allowance standing.",
    mechanism:
      "The router is approved for one cycle's exact amount and reset to zero in the same transaction, before the output is even measured.",
  },
  {
    refusal: "It will not overcharge you.",
    mechanism:
      "The fee is read from the registry and clamped locally against a compiled-in ceiling, so a compromised registry cannot raise it past 0.50%.",
  },
  {
    refusal: "It will not trap you.",
    mechanism:
      "Withdrawal works while the vault is paused, while the protocol is halted, and while the oracle is down. The exit is never gated.",
  },
  {
    refusal: "It will not strand what it bought.",
    mechanism:
      "Every asset a vault can accumulate, it can return — by address, not just the asset it spends. exitAll returns all of it in one transaction.",
  },
] as const;

export function Guarantees() {
  const root = useScene<HTMLElement>(({ gsap, q, reduced }) => {
    gsap.fromTo(
      q("[data-refusal]"),
      { opacity: 0, y: reduced ? 0 : 16 },
      {
        opacity: 1,
        y: 0,
        duration: D.base,
        ease: E.out,
        stagger: STAGGER.tight,
        scrollTrigger: { trigger: q("[data-refusal-list]")[0], start: "top 80%", once: true },
      }
    );
  });

  return (
    <section ref={root} id="guarantees" className="scroll-mt-16 py-20 md:py-28">
      <div className="shell">
        <header className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="t-eyebrow">Guarantees</p>
            <h2 className="t-display mt-3 text-[clamp(1.75rem,4vw,3rem)]">
              What the vault will not do.
            </h2>
          </div>
          <p className="max-w-[46ch] self-end text-[14px] leading-[1.65] text-mid md:col-span-5 md:col-start-8">
            A protocol&rsquo;s promises are only worth the code that enforces them. Each of these is a
            refusal compiled into the contract, with the mechanism named beside it.
          </p>
        </header>

        <dl data-refusal-list className="mt-12 border-t border-hairline md:mt-16">
          {REFUSALS.map((item) => (
            <div
              key={item.refusal}
              data-refusal
              className="grid gap-x-8 gap-y-1.5 border-b border-hairline py-5 md:grid-cols-12 md:py-6"
              data-tide-reveal
            >
              <dt className="text-[15px] font-medium leading-[1.4] text-hi md:col-span-5">
                {item.refusal}
              </dt>
              <dd className="max-w-[62ch] text-[13.5px] leading-[1.6] text-low md:col-span-6 md:col-start-7">
                {item.mechanism}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
