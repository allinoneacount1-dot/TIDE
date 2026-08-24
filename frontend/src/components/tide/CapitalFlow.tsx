"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useMotion } from "@/components/motion";
import { cn } from "@/lib/cn";

/**
 * THE TIDE LINE — TIDE's signature capital-flow visual.
 *
 * One continuous trajectory carries capital through six states and returns
 * underneath to begin again. The outward line swells and recedes like a tide;
 * the return is drawn faintly along the bottom, which is what makes recurrence
 * legible without resorting to a giant circular arrow.
 *
 * Three rules govern it, and they are the reason it looks the way it does:
 *
 *   • It is a MODEL, not telemetry. On the landing page nothing here is a
 *     measurement, so it is marked SCHEMATIC and every value TIDE cannot know
 *     is an em-dash — the same convention `format.ts` uses everywhere else.
 *     Pass `live` and the marker flips, the values fill in, and only then does
 *     it claim to describe something real.
 *
 *   • Acid is a signal, not a surface. It marks the travelled portion of the
 *     line, the active node, and live figures. Everything else is graphite and
 *     off-white. The ratio is roughly the ratio in the wordmark.
 *
 *   • It is SVG and DOM. Six nodes, two paths and a transform — a canvas would
 *     cost a megabyte of runtime to draw this and would be invisible to a
 *     screen reader. The accessible fallback is a real ordered list.
 */

export const FLOW_NODES = [
  {
    id: "capital",
    index: "01",
    label: "Capital",
    state: "Deposited",
    x: 110,
    y: 300,
    caption: "Capital enters the vault you own. Non-custodial, withdrawable at any moment.",
  },
  {
    id: "vault",
    index: "02",
    label: "Vault",
    state: "Armed",
    x: 330,
    y: 286,
    caption: "The vault holds it, idle, until a window opens. TIDE cannot move it.",
  },
  {
    id: "cadence",
    index: "03",
    label: "Cadence",
    state: "Window open",
    x: 620,
    y: 250,
    caption: "Your interval elapses. Size and price ceiling were decided in advance.",
  },
  {
    id: "execution",
    index: "04",
    label: "Execution",
    state: "Executing",
    x: 940,
    y: 180,
    caption: "One cycle routes to an allowlisted venue. The allowance is exact and revoked in the same call.",
  },
  {
    id: "settlement",
    index: "05",
    label: "Settlement",
    state: "Confirmed",
    x: 1130,
    y: 226,
    caption: "Output is measured as a balance delta and checked against the floor before it is accepted.",
  },
  {
    id: "cycle",
    index: "06",
    label: "Next cycle",
    state: "Scheduled",
    x: 1450,
    y: 292,
    caption: "The cadence steps forward on its original grid. No burst catch-up after an outage.",
  },
] as const;

export type FlowNodeId = (typeof FLOW_NODES)[number]["id"];

/** The outward trajectory: swell to execution, recede into settlement. */
const OUT_PATH =
  "M 110 300 C 190 300 250 290 330 286 C 430 280 500 272 620 250 " +
  "C 736 229 806 196 940 180 C 1004 172 1078 200 1130 226 " +
  "C 1222 264 1332 289 1450 292";

/** The return: the tide going back out, under everything, to start again. */
const RETURN_PATH =
  "M 1450 292 C 1526 296 1558 340 1552 398 L 208 398 C 152 398 110 366 110 316";

/** Fraction of the outward path at each node. Measured on mount; these are the
 *  fallbacks used for the first paint and when layout measurement is refused. */
const FALLBACK_FRACTIONS = [0, 0.163, 0.379, 0.629, 0.77, 1];


/** The same six stages turned upright, for phones. */
const V_NODES = [
  { x: 60, y: 52 },
  { x: 50, y: 158 },
  { x: 68, y: 282 },
  { x: 44, y: 420 },
  { x: 64, y: 540 },
  { x: 56, y: 656 },
] as const;

const V_PATH =
  "M 60 52 C 60 96 50 118 50 158 C 50 214 68 226 68 282 " +
  "C 68 348 44 356 44 420 C 44 480 64 486 64 540 C 64 600 56 604 56 656";

const V_RETURN = "M 56 656 C 30 674 14 660 14 626 L 14 92 C 14 62 32 50 60 52";

const V_FRACTIONS = [0, 0.174, 0.378, 0.609, 0.808, 1];

export type LiveFlow = {
  /** e.g. "USDG → AAPL". Omit when unknown. */
  pair?: string;
  /** On-chain cycle number for the plan being drawn. */
  cycle?: string;
  /** Human status for the active node. */
  status?: string;
  /** Time until the next window, already formatted. */
  nextWindow?: string;
};

export function CapitalFlow({
  active,
  autoplay = true,
  live,
  caption = true,
  className,
}: {
  active?: FlowNodeId;
  autoplay?: boolean;
  /** Present only when these figures come from the chain. */
  live?: LiveFlow;
  /** Off for brand exports, where the surrounding layout carries the words. */
  caption?: boolean;
  className?: string;
}) {
  const controlled = active !== undefined;
  const [internal, setInternal] = useState(3);
  const { reduced } = useMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<SVGPathElement>(null);
  const progressRef = useRef<SVGPathElement>(null);
  const leadRef = useRef<SVGPathElement>(null);
  const packetRef = useRef<SVGGElement>(null);
  const fractions = useRef<number[]>([...FALLBACK_FRACTIONS]);

  const index = controlled ? Math.max(0, FLOW_NODES.findIndex((n) => n.id === active)) : internal;
  const node = FLOW_NODES[index]!;

  // Measure where each node actually falls along the curve. Estimating from x
  // spacing alone would drift wherever the line is steep, and the packet would
  // visibly lead or lag its node.
  useLayoutEffect(() => {
    const path = outRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    if (!total) return;

    const SAMPLES = 600;
    const measured = FLOW_NODES.map((n) => {
      let bestLen = 0;
      let bestDx = Infinity;
      for (let s = 0; s <= SAMPLES; s++) {
        const len = (total * s) / SAMPLES;
        const dx = Math.abs(path.getPointAtLength(len).x - n.x);
        if (dx < bestDx) {
          bestDx = dx;
          bestLen = len;
        }
      }
      return bestLen / total;
    });
    fractions.current = measured;
  }, []);

  // Advance on its own only while uncontrolled, on screen, and motion is
  // allowed. An explainer looping in a background tab is pure battery cost.
  useEffect(() => {
    if (controlled || !autoplay || reduced) return;
    const el = rootRef.current;
    if (!el) return;

    let timer: number | undefined;
    const start = () => {
      timer = window.setInterval(() => setInternal((i) => (i + 1) % FLOW_NODES.length), 2800);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
    };

    const io = new IntersectionObserver(
      ([entry]) => (entry?.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0.2 }
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

  // Draw the travelled portion and carry the packet to the active node. Two
  // tweens on two properties: the whole motion budget of this component.
  useEffect(() => {
    const path = outRef.current;
    const progress = progressRef.current;
    const lead = leadRef.current;
    const packet = packetRef.current;
    if (!path || !progress || !lead || !packet) return;

    const f = fractions.current[index] ?? FALLBACK_FRACTIONS[index] ?? 0;
    const total = path.getTotalLength() || 1;
    const point = path.getPointAtLength(total * f);

    if (reduced) {
      gsap.set(progress, { strokeDashoffset: 1 - f });
      gsap.set(lead, { strokeDashoffset: 0.06 - f });
      gsap.set(packet, { attr: { transform: `translate(${point.x} ${point.y})` } });
      return;
    }

    const tweens = [
      gsap.to(progress, { strokeDashoffset: 1 - f, duration: 1.1, ease: "power3.inOut" }),
      gsap.to(lead, { strokeDashoffset: 0.06 - f, duration: 1.1, ease: "power3.inOut" }),
      gsap.to(packet, {
        attr: { transform: `translate(${point.x} ${point.y})` },
        duration: 1.1,
        ease: "power3.inOut",
      }),
    ];
    return () => tweens.forEach((t) => t.kill());
  }, [index, reduced]);

  const em = "—";

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      <svg
        viewBox="0 0 1600 470"
        className="hidden w-full md:block"
        role="img"
        aria-label="How one TIDE cycle moves capital: deposited, armed, window open, executing, confirmed, then scheduled again."
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Framing rules. Two hairlines, no box. */}
        <line x1="0" y1="40" x2="1600" y2="40" stroke="var(--color-hairline)" strokeWidth="1" />
        <line x1="0" y1="428" x2="1600" y2="428" stroke="var(--color-hairline)" strokeWidth="1" />

        {/* Station verticals — the grid, kept below the threshold of notice. */}
        {FLOW_NODES.map((n) => (
          <line
            key={`grid-${n.id}`}
            x1={n.x}
            y1="40"
            x2={n.x}
            y2="428"
            stroke="var(--color-hairline)"
            strokeWidth="1"
            opacity="0.55"
          />
        ))}

        {/* The return. Faint, dashed, underneath: the tide going back out. */}
        <path
          d={RETURN_PATH}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="1"
          strokeDasharray="2 6"
          opacity="0.7"
        />
        <text
          x="812"
          y="392"
          textAnchor="middle"
          className="font-mono"
          fontSize="10"
          letterSpacing="2"
          fill="var(--color-dim)"
        >
          RETURNS TO CADENCE
        </text>

        {/* The trajectory, twice: the whole channel, then the travelled part. */}
        <path ref={outRef} d={OUT_PATH} fill="none" stroke="var(--color-rule)" strokeWidth="1.25" />
        {/* Travelled portion, held well down: acid is a signal, not a surface. */}
        <path
          ref={progressRef}
          d={OUT_PATH}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.25"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - (FALLBACK_FRACTIONS[index] ?? 0)}
          opacity="0.3"
        />
        {/* The leading edge — the only fully saturated run of line on the page. */}
        <path
          ref={leadRef}
          d={OUT_PATH}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.6"
          pathLength={1}
          strokeDasharray="0.06 1"
          strokeDashoffset={0.06 - (FALLBACK_FRACTIONS[index] ?? 0)}
        />

        {/* Capital in transit. Drawn before the nodes so it haloes them rather
            than covering the glyph that says what the stage is. */}
        <g ref={packetRef} transform={`translate(${node.x} ${node.y})`}>
          <rect x={-13} y={-13} width={26} height={26} fill="var(--color-signal)" opacity="0.07" />
        </g>

        {FLOW_NODES.map((n, i) => (
          <FlowNode key={n.id} node={n} state={i === index ? "active" : i < index ? "past" : "ahead"} />
        ))}

        {/* Execution carries the most information on the page — which is what
            makes it read as the strongest node without shouting in colour. */}
        <g transform="translate(940 108)">
          <line x1="0" y1="-18" x2="0" y2="52" stroke="var(--color-rule)" strokeWidth="1" />
          <Field y={0} label="PAIR" value={live?.pair ?? "USDG → AAPL"} known={Boolean(live?.pair)} />
          <Field y={17} label="CYCLE" value={live?.cycle ?? em} known={Boolean(live?.cycle)} />
          <Field y={34} label="STATUS" value={live?.status ?? "EXECUTING"} known={Boolean(live?.status)} />
        </g>

        <g transform="translate(1450 108)">
          <Field y={0} label="NEXT WINDOW" value={live?.nextWindow ?? em} known={Boolean(live?.nextWindow)} />
        </g>

        {/* The honesty marker. One line, small, never absent. */}
        <g transform="translate(0 458)">
          <rect
            x="0"
            y="-11"
            width={live ? 34 : 74}
            height="14"
            fill={live ? "var(--color-signal)" : "transparent"}
            stroke={live ? "none" : "var(--color-rule-strong)"}
            strokeWidth="1"
          />
          <text
            x={live ? 17 : 37}
            y="-1"
            textAnchor="middle"
            className="font-mono"
            fontSize="9"
            letterSpacing="1.6"
            fill={live ? "var(--color-signal-ink)" : "var(--color-low)"}
          >
            {live ? "LIVE" : "SCHEMATIC"}
          </text>
          <text x={live ? 46 : 86} y="-1" className="font-mono" fontSize="9" letterSpacing="1.6" fill="var(--color-dim)">
            {live ? "FIGURES READ FROM CHAIN" : "MODEL OF THE PROTOCOL — NOT LIVE DATA"}
          </text>
        </g>
      </svg>


      {/* Mobile takes the same system rotated onto its side. Scaling the wide
          trajectory down to a phone puts the mono labels at two or three pixels
          — present, unreadable, and worse than useless. The line, the glyphs,
          the acid leading edge and the return channel all survive the turn. */}
      <svg
        viewBox="0 0 360 720"
        className="w-full md:hidden"
        role="img"
        aria-label="How one TIDE cycle moves capital: deposited, armed, window open, executing, confirmed, then scheduled again."
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={V_RETURN}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="1"
          strokeDasharray="2 6"
          opacity="0.7"
        />
        <text
          transform="rotate(-90 14 360)"
          x="14"
          y="360"
          textAnchor="middle"
          className="font-mono"
          fontSize="8.5"
          letterSpacing="1.8"
          fill="var(--color-dim)"
        >
          RETURNS TO CADENCE
        </text>

        <path d={V_PATH} fill="none" stroke="var(--color-rule)" strokeWidth="1.25" />
        <path
          d={V_PATH}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.25"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - (V_FRACTIONS[index] ?? 0)}
          opacity="0.3"
          style={{ transition: reduced ? "none" : "stroke-dashoffset .9s cubic-bezier(.65,0,.35,1)" }}
        />
        <path
          d={V_PATH}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.6"
          pathLength={1}
          strokeDasharray="0.07 1"
          strokeDashoffset={0.07 - (V_FRACTIONS[index] ?? 0)}
          style={{ transition: reduced ? "none" : "stroke-dashoffset .9s cubic-bezier(.65,0,.35,1)" }}
        />

        {FLOW_NODES.map((n, i) => {
          const v = V_NODES[i]!;
          const isActive = i === index;
          const isPast = i < index;
          const stroke = isActive
            ? "var(--color-signal)"
            : isPast
              ? "var(--color-rule-strong)"
              : "var(--color-rule)";
          const ink = isActive
            ? "var(--color-signal)"
            : isPast
              ? "var(--color-low)"
              : "var(--color-dim)";
          return (
            <g key={`v-${n.id}`}>
              <g transform={`translate(${v.x} ${v.y})`}>
                <Glyph id={n.id} stroke={stroke} ink={ink} active={isActive} />
              </g>
              <line
                x1={v.x + 22}
                y1={v.y}
                x2={96}
                y2={v.y}
                stroke={isActive ? "var(--color-signal-edge)" : "var(--color-hairline)"}
                strokeWidth="1"
              />
              <text
                x="106"
                y={v.y - 6}
                className="font-mono"
                fontSize="10"
                letterSpacing="1.4"
                fill={isActive ? "var(--color-signal)" : "var(--color-dim)"}
              >
                {n.index}
              </text>
              <text
                x="134"
                y={v.y - 6}
                className="font-mono"
                fontSize="12.5"
                letterSpacing="2"
                fill={isActive ? "var(--color-hi)" : "var(--color-mid)"}
              >
                {n.label.toUpperCase()}
              </text>
              <text
                x="134"
                y={v.y + 11}
                className="font-mono"
                fontSize="10"
                letterSpacing="1.6"
                fill={isActive ? "var(--color-signal)" : "var(--color-low)"}
              >
                {n.state.toUpperCase()}
              </text>

              {n.id === "execution" ? (
                <g transform={`translate(120 ${v.y + 32})`}>
                  <Field y={0} label="PAIR" value={live?.pair ?? "USDG → AAPL"} known={Boolean(live?.pair)} compact />
                  <Field y={16} label="CYCLE" value={live?.cycle ?? em} known={Boolean(live?.cycle)} compact />
                </g>
              ) : null}

              {n.id === "cycle" ? (
                <g transform={`translate(120 ${v.y + 32})`}>
                  <Field
                    y={0}
                    label="NEXT WINDOW"
                    value={live?.nextWindow ?? em}
                    known={Boolean(live?.nextWindow)}
                    compact
                  />
                </g>
              ) : null}
            </g>
          );
        })}

        <g transform="translate(0 706)">
          <rect
            x="0"
            y="-11"
            width={live ? 34 : 74}
            height="14"
            fill={live ? "var(--color-signal)" : "transparent"}
            stroke={live ? "none" : "var(--color-rule-strong)"}
            strokeWidth="1"
          />
          <text
            x={live ? 17 : 37}
            y="-1"
            textAnchor="middle"
            className="font-mono"
            fontSize="9"
            letterSpacing="1.6"
            fill={live ? "var(--color-signal-ink)" : "var(--color-low)"}
          >
            {live ? "LIVE" : "SCHEMATIC"}
          </text>
        </g>
      </svg>

      {/* Caption for the active state, so the picture is never the only carrier. */}
      <div className={cn("mt-4 min-h-[3.25rem] md:mt-5", !caption && "hidden")}>
        <p className="t-eyebrow text-signal">
          {node.index} · {node.label} — {node.state}
        </p>
        <p className="mt-1.5 max-w-[62ch] text-[13px] leading-[1.55] text-mid">{node.caption}</p>
      </div>

      <ol className="sr-only">
        {FLOW_NODES.map((n) => (
          <li key={n.id}>
            {n.label} ({n.state}): {n.caption}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Field({
  y,
  label,
  value,
  known,
  compact = false,
}: {
  y: number;
  label: string;
  value: string;
  known: boolean;
  compact?: boolean;
}) {
  return (
    <g transform={`translate(0 ${y})`}>
      <text x="10" y="0" className="font-mono" fontSize="9.5" letterSpacing="1.5" fill="var(--color-low)">
        {label}
      </text>
      <text
        x={compact ? 92 : 112}
        y="0"
        className="font-mono"
        fontSize="10.5"
        letterSpacing="0.6"
        fill={known ? "var(--color-signal)" : "var(--color-mid)"}
      >
        {value}
      </text>
    </g>
  );
}

/**
 * Each node gets its own glyph. Six identical dots would make the six stages
 * look like one repeated stage; the shapes carry the difference. All of them
 * are built from the chamfer — one corner cut at forty-five degrees, never
 * four — which is the motif the wordmark's terminals establish.
 */
function FlowNode({
  node,
  state,
}: {
  node: (typeof FLOW_NODES)[number];
  state: "active" | "past" | "ahead";
}) {
  const active = state === "active";
  const past = state === "past";

  const ink = active ? "var(--color-signal)" : past ? "var(--color-low)" : "var(--color-dim)";
  const stroke = active
    ? "var(--color-signal)"
    : past
      ? "var(--color-rule-strong)"
      : "var(--color-rule)";

  // Labels live on two rails, clear of the curve's whole travel, joined to
  // their node by a hairline stem. Scattering them around the line means one
  // of them eventually sits on it at some viewport width; a rail cannot.
  const TOP_RAIL = 76;
  const BOTTOM_RAIL = 352;
  const onTop = node.id === "vault" || node.id === "execution" || node.id === "cycle";
  const ly = onTop ? TOP_RAIL : BOTTOM_RAIL;
  // Execution's stem starts below its data block; the others clear their text.
  const stemStart = onTop ? (node.id === "execution" ? 166 : 100) : BOTTOM_RAIL - 30;
  const stemEnd = onTop ? node.y - 22 : node.y + 22;

  return (
    <g>
      <g transform={`translate(${node.x} ${node.y})`}>
        <Glyph id={node.id} stroke={stroke} ink={ink} active={active} />
      </g>

      <line
        x1={node.x}
        y1={stemStart}
        x2={node.x}
        y2={stemEnd}
        stroke={active ? "var(--color-signal-edge)" : "var(--color-hairline)"}
        strokeWidth="1"
      />

      <g transform={`translate(${node.x} ${ly})`}>
        <text x="0" y="0" className="font-mono" fontSize="10" letterSpacing="1.4" fill={active ? "var(--color-signal)" : "var(--color-dim)"}>
          {node.index}
        </text>
        <text x="26" y="0" className="font-mono" fontSize="12" letterSpacing="2.2" fill={active ? "var(--color-hi)" : "var(--color-mid)"}>
          {node.label.toUpperCase()}
        </text>
        <text x="26" y="17" className="font-mono" fontSize="9.5" letterSpacing="1.6" fill={active ? "var(--color-signal)" : "var(--color-low)"}>
          {node.state.toUpperCase()}
        </text>
      </g>
    </g>
  );
}

/**
 * The six glyphs. Identical dots would make six distinct stages look like one
 * stage repeated, so each carries its own form — all of them built from the
 * chamfer, the motif the wordmark's terminals establish.
 */
function Glyph({
  id,
  stroke,
  ink,
  active,
}: {
  id: FlowNodeId;
  stroke: string;
  ink: string;
  active: boolean;
}) {
  return (
    <>
      {id === "capital" ? (
          <path d="M -9 -9 H 4 L 9 -4 V 9 H -9 Z" fill="var(--color-ground)" stroke={stroke} strokeWidth="1.25" />
        ) : null}

        {id === "vault" ? (
          <g>
            <path d="M -9 -12 H 4 L 9 -7 V 12 H -9 Z" fill="var(--color-ground)" stroke={stroke} strokeWidth="1.25" />
            <line x1="-9" y1="1" x2="9" y2="1" stroke={stroke} strokeWidth="1" />
          </g>
        ) : null}

        {id === "cadence" ? (
          <g stroke={stroke} strokeWidth="1.25">
            <line x1="-12" y1="-8" x2="-12" y2="8" />
            <line x1="-6" y1="-11" x2="-6" y2="11" />
            <line x1="0" y1="-13" x2="0" y2="13" />
            <line x1="6" y1="-11" x2="6" y2="11" />
            <line x1="12" y1="-8" x2="12" y2="8" />
          </g>
        ) : null}

        {id === "execution" ? (
          <g>
            {/* corner brackets — the node under instrumentation */}
            <path
              d="M -20 -12 V -20 H -12 M 12 -20 H 20 V -12 M 20 12 V 20 H 12 M -12 20 H -20 V 12"
              fill="none"
              stroke={active ? "var(--color-signal-edge)" : "var(--color-rule)"}
              strokeWidth="1.25"
            />
            <path
              d="M -10 -10 H 5 L 10 -5 V 10 H -10 Z"
              fill={active ? "var(--color-signal)" : "var(--color-ground)"}
              stroke={stroke}
              strokeWidth="1.25"
            />
          </g>
        ) : null}

        {id === "settlement" ? (
          <g>
            <path d="M -10 -10 H 5 L 10 -5 V 10 H -10 Z" fill="var(--color-ground)" stroke={stroke} strokeWidth="1.25" />
            <path d="M -5 0 L -1 4 L 6 -5" fill="none" stroke={ink} strokeWidth="1.5" />
          </g>
        ) : null}

        {id === "cycle" ? (
          <g>
            <path d="M -10 -10 H 5 L 10 -5 V 10 H -10 Z" fill="var(--color-ground)" stroke={stroke} strokeWidth="1.25" />
            <rect x="-10" y="-10" width="7" height="20" fill={ink} opacity={active ? 0.9 : 0.35} />
          </g>
        ) : null}
    </>
  );
}
