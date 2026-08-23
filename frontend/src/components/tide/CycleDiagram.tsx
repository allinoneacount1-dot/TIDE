"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useMotion } from "@/components/motion";
import { cn } from "@/lib/cn";

/**
 * THE CYCLE — TIDE's signature interface object.
 *
 * A single recurring execution, drawn as the channel capital actually moves
 * through: idle capital sits in the vault, a window opens on the cadence, the
 * keeper routes one cycle to market, settlement lands back as an asset, the
 * cadence advances. Six stations, one line, one packet moving along it.
 *
 * Two rules govern this component, both from the brief:
 *
 *   • It is a *model*, never fabricated telemetry. Station labels describe the
 *     protocol's mechanism; there are no invented balances, prices or
 *     timestamps anywhere in it. When the dashboard mounts it with a real plan,
 *     `activeStation` is driven by that plan's on-chain readiness, and the
 *     numbers beside it come from the chain — not from here.
 *
 *   • It is DOM and SVG, not WebGL. The whole thing is six nodes, a path and a
 *     transform; a canvas context would cost a megabyte of runtime to draw
 *     what a 3KB SVG draws natively, and would be invisible to a screen reader.
 *     The accessible fallback is a real ordered list.
 */

export const STATIONS = [
  {
    id: "capital",
    label: "Capital",
    caption: "Idle balance held in your own vault. Non-custodial, withdrawable at any moment.",
  },
  {
    id: "cadence",
    label: "Cadence",
    caption: "You set the interval, the size, and the highest price you will pay.",
  },
  {
    id: "window",
    label: "Window",
    caption: "The interval elapses. The vault reports itself executable — and why, when it is not.",
  },
  {
    id: "route",
    label: "Route",
    caption: "One cycle is routed to an allowlisted venue. The allowance is exact and revoked in the same call.",
  },
  {
    id: "settle",
    label: "Settle",
    caption: "Output is measured as a balance delta and checked against the price guard before it is accepted.",
  },
  {
    id: "advance",
    label: "Advance",
    caption: "The cadence steps forward on its original grid. No burst catch-up after an outage.",
  },
] as const;

export type StationId = (typeof STATIONS)[number]["id"];

export function CycleDiagram({
  /** Drive from real state. Omit to let the diagram cycle as an explainer. */
  activeStation,
  /** Auto-advance when uncontrolled. */
  autoplay = true,
  className,
  compact = false,
  onStationChange,
}: {
  activeStation?: StationId;
  autoplay?: boolean;
  className?: string;
  compact?: boolean;
  onStationChange?: (id: StationId) => void;
}) {
  const controlled = activeStation !== undefined;
  const [internal, setInternal] = useState(0);
  const { reduced } = useMotion();
  const packetRef = useRef<SVGGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const index = controlled ? Math.max(0, STATIONS.findIndex((s) => s.id === activeStation)) : internal;

  // Auto-advance only while uncontrolled, visible and motion is allowed. An
  // explainer looping in a background tab is pure battery cost.
  useEffect(() => {
    if (controlled || !autoplay || reduced) return;
    const el = rootRef.current;
    if (!el) return;

    let timer: number | undefined;
    const start = () => {
      timer = window.setInterval(() => setInternal((i) => (i + 1) % STATIONS.length), 2600);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
    };

    const io = new IntersectionObserver(
      ([entry]) => (entry?.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0.25 }
    );
    io.observe(el);

    const onVisibility = () => (document.hidden ? stop() : undefined);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [controlled, autoplay, reduced]);

  useEffect(() => {
    onStationChange?.(STATIONS[index]!.id);
  }, [index, onStationChange]);

  // Move the packet along the channel. One tween on one transform — the whole
  // animation budget of this component.
  useEffect(() => {
    const node = packetRef.current;
    if (!node) return;
    const x = stationX(index);
    if (reduced) {
      gsap.set(node, { attr: { transform: `translate(${x} 0)` } });
      return;
    }
    const tween = gsap.to(node, {
      attr: { transform: `translate(${x} 0)` },
      duration: 0.9,
      ease: "power3.inOut",
    });
    return () => {
      tween.kill();
    };
  }, [index, reduced]);

  const active = STATIONS[index]!;

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      <svg
        viewBox="0 0 900 120"
        className="w-full"
        role="img"
        aria-label="How one TIDE execution cycle moves capital, in six stages."
        preserveAspectRatio="xMidYMid meet"
      >
        {/* the channel */}
        <line x1="40" y1="60" x2="860" y2="60" stroke="var(--color-rule)" strokeWidth="1" />

        {/* travelled portion, drawn to the active station */}
        <line
          x1="40"
          y1="60"
          x2={stationX(index) + 40}
          y2="60"
          stroke="var(--color-signal)"
          strokeWidth="1"
          opacity="0.5"
          style={{ transition: reduced ? "none" : "all 0.9s cubic-bezier(0.65,0,0.35,1)" }}
        />

        {STATIONS.map((s, i) => {
          const x = stationX(i) + 40;
          const isActive = i === index;
          const isPast = i < index;
          return (
            <g key={s.id}>
              {/* Station tick. The chamfer motif again: a square rotated to a
                  diamond for the active one, a plain tick otherwise. */}
              {isActive ? (
                <rect
                  x={x - 5}
                  y={55}
                  width={10}
                  height={10}
                  fill="var(--color-signal)"
                  transform={`rotate(45 ${x} 60)`}
                />
              ) : (
                <circle
                  cx={x}
                  cy={60}
                  r={isPast ? 3 : 2.5}
                  fill={isPast ? "var(--color-signal)" : "var(--color-ground)"}
                  stroke={isPast ? "var(--color-signal)" : "var(--color-rule-strong)"}
                  strokeWidth="1"
                  opacity={isPast ? 0.55 : 1}
                />
              )}

              <text
                x={x}
                y={i % 2 === 0 ? 38 : 90}
                textAnchor="middle"
                className="font-mono"
                fontSize="10"
                letterSpacing="1.4"
                fill={isActive ? "var(--color-signal)" : isPast ? "var(--color-low)" : "var(--color-dim)"}
              >
                {s.label.toUpperCase()}
              </text>

              {/* stem from label to line */}
              <line
                x1={x}
                y1={i % 2 === 0 ? 44 : 76}
                x2={x}
                y2={i % 2 === 0 ? 54 : 66}
                stroke={isActive ? "var(--color-signal-edge)" : "var(--color-hairline)"}
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* the packet — capital in transit */}
        <g ref={packetRef} transform={`translate(${stationX(index)} 0)`}>
          <rect x={34} y={54} width={12} height={12} fill="var(--color-signal)" opacity="0.14" />
          <rect x={38} y={58} width={4} height={4} fill="var(--color-signal)" />
        </g>
      </svg>

      {!compact ? (
        <div className="mt-4 min-h-[3.5rem] md:mt-5">
          <p className="t-eyebrow text-signal">{active.label}</p>
          <p className="mt-1.5 max-w-[54ch] text-[13px] leading-[1.55] text-mid">{active.caption}</p>
        </div>
      ) : null}

      {/* The same information as an ordered list, for assistive technology and
          for anyone who would rather read it than watch it. */}
      <ol className="sr-only">
        {STATIONS.map((s) => (
          <li key={s.id}>
            {s.label}: {s.caption}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Even spacing across the channel, in viewBox units. */
function stationX(i: number): number {
  const span = 820;
  return (span / (STATIONS.length - 1)) * i;
}
