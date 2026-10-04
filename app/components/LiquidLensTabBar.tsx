"use client";

/**
 * LiquidLensTabBar
 * ----------------
 * A floating glass tab bar with a draggable "water lens":
 *  - the lens slides on a spring and squashes / stretches with velocity (liquid feel)
 *  - it grows when pressed and can be dragged across tabs, snapping on release
 *  - whatever sits under the lens is magnified and brightened (a second, scaled
 *    copy of the tab row is clipped inside the lens)
 *  - Chromium also refracts the page behind the lens through an SVG
 *    displacement filter; Safari / Firefox get a clean blur fallback
 *
 * Requires:  npm i framer-motion
 * Next.js 13+ (App Router). For Pages Router, swap next/navigation for next/router.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ----------------------------- tabs config ----------------------------- */

type Tab = { href: string; label: string; icon: ReactNode };

const Icon = ({ d }: { d: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={d} />
  </svg>
);

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: <Icon d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" /> },
  { href: "/explore", label: "Explore", icon: <Icon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.5 4.5" /> },
  { href: "/saved", label: "Saved", icon: <Icon d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" /> },
  { href: "/profile", label: "Profile", icon: <Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8.5c.6-3.6 3.8-5.5 7.5-5.5s6.9 1.9 7.5 5.5" /> },
];

const PAD = 6; // bar inner padding (px)
const MAGNIFY = 1.22; // zoom inside the lens

/* ------------------------------ component ------------------------------ */

export default function LiquidLensTabBar({ tabs = TABS }: { tabs?: Tab[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const n = tabs.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const measured = useRef(false);
  const [innerW, setInnerW] = useState(0);
  const [svgRefraction, setSvgRefraction] = useState(false);

  const tabW = innerW / n;

  const activeIdx = Math.max(
    0,
    tabs.findIndex((t) =>
      t.href === "/" ? pathname === "/" : pathname === t.href || pathname.startsWith(t.href + "/")
    )
  );

  /* lens position: raw target -> spring */
  const target = useMotionValue(0);
  const x = useSpring(target, { stiffness: 320, damping: 26, mass: 0.85 });
  const press = useSpring(1, { stiffness: 420, damping: 22 });

  /* liquid squash & stretch from velocity */
  const velocity = useVelocity(x);
  const stretch = useTransform(velocity, (v) => 1 + Math.min(Math.abs(v) / 3200, 0.38));
  const scaleX = useTransform([stretch, press], ([s, p]) => (s as number) * (p as number));
  const scaleY = useTransform([stretch, press], ([s, p]) => (1 - ((s as number) - 1) * 0.55) * (p as number));

  /* magnified copy: counter-translate + scale about the lens centre */
  const cloneX = useTransform(x, (v) => -v);
  const cloneOrigin = useTransform(x, (v) => `${v + tabW / 2}px 50%`);

  /* measure track */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setInnerW(el.clientWidth));
    ro.observe(el);
    setInnerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* backdrop-filter: url() only works in Chromium (not iOS) */
  useEffect(() => {
    const ua = navigator.userAgent;
    setSvgRefraction(/Chrome|Chromium|Edg/.test(ua) && !/iPhone|iPad|iPod/.test(ua));
  }, []);

  /* sync lens to route */
  useEffect(() => {
    if (!tabW || dragging.current) return;
    const v = activeIdx * tabW;
    if (!measured.current) {
      measured.current = true;
      target.set(v);
      x.jump(v);
    } else {
      target.set(v);
    }
  }, [activeIdx, tabW, target, x]);

  /* ------------------------------ pointer ------------------------------ */

  const moveTo = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const local = clientX - rect.left - tabW / 2;
    target.set(Math.min(Math.max(local, 0), innerW - tabW));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    press.set(1.14);
    moveTo(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) moveTo(e.clientX);
  };

  const release = () => {
    if (!dragging.current) return;
    dragging.current = false;
    press.set(1);
    const idx = Math.min(Math.max(Math.round(target.get() / tabW), 0), n - 1);
    target.set(idx * tabW);
    if (idx !== activeIdx) router.push(tabs[idx].href);
  };

  /* -------------------------------- UI --------------------------------- */

  const row = (lens: boolean) =>
    tabs.map((t, i) => {
      const inner = (
        <>
          {t.icon}
          <span>{t.label}</span>
        </>
      );
      return lens ? (
        <div key={t.href} className="ll-tab">{inner}</div>
      ) : (
        <Link
          key={t.href}
          href={t.href}
          className="ll-tab"
          aria-current={i === activeIdx ? "page" : undefined}
          // mouse/touch are handled by pointer logic; keyboard (detail 0) navigates natively
          onClick={(e) => { if (e.detail !== 0) e.preventDefault(); }}
        >
          {inner}
        </Link>
      );
    });

  return (
    <>
      {/* water refraction filter (used by the lens in Chromium) */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id="ll-water" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.014" numOctaves="2" seed="4" result="noise">
              <animate attributeName="baseFrequency" dur="9s" repeatCount="indefinite"
                values="0.009 0.014;0.012 0.010;0.009 0.014" />
            </feTurbulence>
            <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="28" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <nav
        className="ll-bar"
        aria-label="Primary"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div className="ll-track" ref={trackRef}>
          {/* base row (real links) */}
          <div className="ll-row">{row(false)}</div>

          {/* the lens */}
          {innerW > 0 && (
            <motion.div
              className="ll-lens"
              aria-hidden
              style={{
                width: tabW,
                x,
                scaleX,
                scaleY,
                ...(svgRefraction
                  ? { backdropFilter: "url(#ll-water) blur(1.5px) brightness(1.14) saturate(1.8)" }
                  : {}),
              }}
            >
              <motion.div
                className="ll-row ll-row--lens"
                style={{
                  width: innerW,
                  x: cloneX,
                  scale: MAGNIFY,
                  transformOrigin: cloneOrigin,
                }}
              >
                {row(true)}
              </motion.div>
              <span className="ll-sheen" />
            </motion.div>
          )}
        </div>
      </nav>

      <style>{CSS}</style>
    </>
  );
}

/* -------------------------------- styles -------------------------------- */

const CSS = `
.ll-bar{
  --ll-tint: rgba(255,255,255,.42);
  --ll-edge: rgba(255,255,255,.65);
  --ll-ink: #1c1c1e;
  --ll-ink-dim: rgba(28,28,30,.58);
  --ll-accent: #0a7aff;
  position: fixed; z-index: 50;
  left: 50%; transform: translateX(-50%);
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  width: min(92vw, 420px); height: 72px;
  padding: ${PAD}px; box-sizing: border-box;
  border-radius: 999px;
  background: var(--ll-tint);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid var(--ll-edge);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.9),
    inset 0 -1px 1px rgba(255,255,255,.25),
    0 12px 32px rgba(0,0,0,.16),
    0 2px 6px rgba(0,0,0,.08);
  touch-action: none; user-select: none; -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}
@media (prefers-color-scheme: dark){
  .ll-bar{
    --ll-tint: rgba(36,36,42,.42);
    --ll-edge: rgba(255,255,255,.2);
    --ll-ink: #fff;
    --ll-ink-dim: rgba(255,255,255,.62);
    --ll-accent: #5aa9ff;
    box-shadow:
      inset 0 1px 1px rgba(255,255,255,.35),
      inset 0 -1px 1px rgba(255,255,255,.06),
      0 14px 34px rgba(0,0,0,.45);
  }
}
.ll-track{ position: relative; width: 100%; height: 100%; }
.ll-row{ position: absolute; inset: 0; display: flex; }
.ll-row--lens{ right: auto; }
.ll-tab{
  flex: 1 1 0; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  color: var(--ll-ink-dim);
  font: 500 11px/1 ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  letter-spacing: .01em; text-decoration: none; outline: none;
}
.ll-tab:focus-visible{ color: var(--ll-ink); box-shadow: inset 0 0 0 2px var(--ll-accent); border-radius: 999px; }
.ll-lens .ll-tab{ color: var(--ll-accent); font-weight: 600; }

.ll-lens{
  position: absolute; top: 0; bottom: 0; left: 0;
  border-radius: 999px; overflow: hidden; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,.34), rgba(255,255,255,.08) 55%, rgba(255,255,255,.18));
  -webkit-backdrop-filter: blur(2px) brightness(1.12) saturate(1.7);
  backdrop-filter: blur(2px) brightness(1.12) saturate(1.7);
  border: 1px solid rgba(255,255,255,.6);
  box-shadow:
    inset 0 1.5px 1px rgba(255,255,255,.95),
    inset 0 -10px 18px rgba(255,255,255,.14),
    inset 0 0 0 1px rgba(255,255,255,.12),
    0 8px 20px rgba(0,0,0,.18);
  will-change: transform;
}
.ll-sheen{
  position: absolute; inset: 0; border-radius: inherit;
  background:
    radial-gradient(120% 70% at 22% 0%, rgba(255,255,255,.7), transparent 55%),
    radial-gradient(90% 60% at 80% 110%, rgba(255,255,255,.28), transparent 60%);
  mix-blend-mode: soft-light;
}
@media (prefers-reduced-motion: reduce){
  .ll-lens{ transition: none; }
}
`;