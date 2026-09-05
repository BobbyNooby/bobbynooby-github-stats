/**
 * Adapter between env config and the renderer. Everything here is set in
 * .env (see src/env.ts + .env.example) — this file only translates names.
 */
import { loadConfig, type SectionName, type SectionTiming } from "./env";

const app = loadConfig();

export const CONFIG = {
  /** shown after the ">" in the title — ">yourname" */
  handle: app.handle,

  /** spinning logo, top right (drop your own at assets/logo.svg) */
  logo: {
    enabled: app.logo !== "none",
    variant: (app.logo === "dot" ? "dot" : "logo") as "logo" | "dot",
    insetFromRight: app.logoInset, // px from the right border; bigger = further left
    y: app.logoY, // px from the top border
    size: app.logoSize, // rendered width/height in px
  },

  /** section toggles */
  showBar: app.showBar,
  showGraphs: app.showGraphs !== false, // full gating (MIN_HISTORY_DAYS) happens in the provider
  showAllLanguages: app.showAllLanguages,

  /** animation timing — preset -> speed -> per-section overrides */
  animation: {
    preset: app.animPreset,
    speed: app.animSpeed,
    overrides: app.animOverrides,
  },
};

export type { SectionName, SectionTiming };

/**
 * Resolved per-section timings (seconds). Computed from
 * CONFIG.animation: preset -> speed multiplier -> overrides.
 */
interface PresetTiming {
  delay: number;
  dur: number;
  stagger: number;
  gap?: number;
}

const PRESETS: Record<
  "cascade" | "snappy" | "together",
  Record<SectionName, PresetTiming>
> = {
  cascade: {
    totals: { delay: 0.15, dur: 0.5, stagger: 0.12 },
    bar: { delay: 0.5, dur: 1.2, stagger: 0 },
    tiles: { delay: 1.8, dur: 0.45, stagger: 0.12 },
    graphs: { delay: 2.3, dur: 1.1, stagger: 0.12, gap: 0.5 },
    allLanguages: { delay: 4.3, dur: 0.45, stagger: 0.05 },
    logo: { delay: 0.51, dur: 0.4, stagger: 0 },
  },
  snappy: {
    totals: { delay: 0.08, dur: 0.3, stagger: 0.07 },
    bar: { delay: 0.25, dur: 0.7, stagger: 0 },
    tiles: { delay: 0.9, dur: 0.3, stagger: 0.07 },
    graphs: { delay: 1.2, dur: 0.8, stagger: 0.07, gap: 0.25 },
    allLanguages: { delay: 2.2, dur: 0.3, stagger: 0.03 },
    logo: { delay: 0.26, dur: 0.3, stagger: 0 },
  },
  together: {
    totals: { delay: 0.15, dur: 0.5, stagger: 0.05 },
    bar: { delay: 0.2, dur: 1.2, stagger: 0 },
    tiles: { delay: 0.35, dur: 0.45, stagger: 0.05 },
    graphs: { delay: 0.5, dur: 1.1, stagger: 0.06, gap: 0.2 },
    allLanguages: { delay: 0.8, dur: 0.45, stagger: 0.03 },
    logo: { delay: 0.2, dur: 0.4, stagger: 0 },
  },
};

export function resolveAnimation(): Record<SectionName, SectionTiming> {
  const a = CONFIG.animation;
  const scale = (s: PresetTiming): SectionTiming => ({
    delay: s.delay * a.speed,
    dur: s.dur * a.speed,
    stagger: s.stagger * a.speed,
    ...(s.gap !== undefined ? { gap: s.gap * a.speed } : {}),
  });
  const preset = PRESETS[a.preset] ?? PRESETS.cascade;
  const base = Object.fromEntries(
    Object.entries(preset).map(([k, v]) => [k, scale(v as PresetTiming)]),
  ) as Record<SectionName, SectionTiming>;
  for (const [section, o] of Object.entries(a.overrides)) {
    const target = base[section as SectionName];
    if (target && o) Object.assign(target, o);
  }
  return base;
}
