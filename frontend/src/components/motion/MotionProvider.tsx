"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type MotionContextValue = {
  /** True when the user has asked for reduced motion. */
  reduced: boolean;
  /** True once GSAP is registered and it is safe to run timelines. */
  ready: boolean;
};

const MotionContext = createContext<MotionContextValue>({ reduced: false, ready: false });

export function useMotion() {
  return useContext(MotionContext);
}

/**
 * Registers GSAP once for the whole app and publishes the reduced-motion state.
 *
 * Two things this fixes from the previous build:
 *
 *   • ScrollTrigger was registered inside every page component, so each route
 *     re-registered it and stale triggers from the previous route survived.
 *     Here it is registered once and `ScrollTrigger.refresh()` runs after
 *     layout settles.
 *
 *   • `prefers-reduced-motion` was read once at mount and never again, so a user
 *     changing the OS setting kept the animated experience until a hard reload.
 *     This subscribes to the media query.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const registered = useRef(false);

  useEffect(() => {
    if (!registered.current) {
      gsap.registerPlugin(ScrollTrigger);
      // Nothing in TIDE animates faster than the display can show it.
      gsap.ticker.lagSmoothing(500, 33);
      registered.current = true;
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);

    document.documentElement.classList.add("tide-motion-ready");
    setReady(true);

    return () => mq.removeEventListener("change", apply);
  }, []);

  // ScrollTrigger measures on creation. Fonts and async panels land after that,
  // so positions drift unless we re-measure once things settle.
  useEffect(() => {
    if (!ready) return;
    const refresh = () => ScrollTrigger.refresh();
    const t = window.setTimeout(refresh, 240);
    if (document.fonts?.ready) void document.fonts.ready.then(refresh);
    window.addEventListener("load", refresh);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("load", refresh);
    };
  }, [ready]);

  const value = useMemo(() => ({ reduced, ready }), [reduced, ready]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
