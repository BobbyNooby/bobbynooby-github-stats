/**
 * ────────────────────────── Make it yours ──────────────────────────
 * Fork-tuning lives HERE. Everything else in src/ is engine.
 *
 * Data sources (what needs what):
 *   • The header, language bar, tiles and totals only need GitHub API
 *     data — your cron instance's /api/stats. Works out of the box.
 *   • The two line graphs additionally need GIT history, which only
 *     github-stats-cron provides (via /api/lang-history, populated by
 *     its backfill). Without it the card renders without the graphs.
 */
export const CONFIG = {
  /** shown after the ">" in the title — e.g. ">yourname" */
  handle: "bobbynooby",

  /** spinning logo, top right (traced vector path in src/logo.ts).
   *  swap `body` there with your own mark, or set enabled: false */
  logo: {
    enabled: true,
    variant: "logo" as "logo" | "dot",
    insetFromRight: 40, // px from the right border; bigger = further left
    y: 23, // px from the top border (logo's top edge)
    size: 27, // rendered width/height in px
  },

  /** section toggles */
  showBar: true,
  showGraphs: true, // needs git history from github-stats-cron
  showAllLanguages: true,

  /**
   * Animation timing.
   *  preset:
   *    "cascade"  — sections appear one after the other (the original, ~6s total)
   *    "snappy"   — same order, everything ~2x faster (~2.5s total)
   *    "together" — all sections start almost at once (~1s total)
   *  speed    — multiplies every delay/duration (0.5 = twice as fast)
   *  overrides — full control: pin any section's delay/duration/stagger in
   *              seconds, applied after preset + speed. Sections: totals,
   *              bar, tiles, graphs, allLanguages, logo.
   */
  animation: {
    preset: "together" as "cascade" | "snappy" | "together",
    speed: 1,
    overrides: {} as Partial<
      Record<
        "totals" | "bar" | "tiles" | "graphs" | "allLanguages" | "logo",
        { delay?: number; dur?: number; stagger?: number }
      >
    >,
  },
};

/**
 * Resolved per-section timings (seconds). Computed from
 * CONFIG.animation: preset -> speed multiplier -> overrides.
 */
export type SectionName =
  "totals" | "bar" | "tiles" | "graphs" | "allLanguages" | "logo";
export interface SectionTiming {
  delay: number;
  dur: number;
  stagger: number;
  gap?: number; // graphs only: pause between the two plots
}

const PRESETS: Record<
  "cascade" | "snappy" | "together",
  Record<SectionName, SectionTiming>
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
  const scale = (s: SectionTiming): SectionTiming => ({
    delay: s.delay * a.speed,
    dur: s.dur * a.speed,
    stagger: s.stagger * a.speed,
    ...(s.gap !== undefined ? { gap: s.gap * a.speed } : {}),
  });
  const preset = PRESETS[a.preset] ?? PRESETS.cascade;
  const base = Object.fromEntries(
    Object.entries(preset).map(([k, v]) => [k, scale(v as SectionTiming)]),
  ) as Record<SectionName, SectionTiming>;
  for (const [section, o] of Object.entries(a.overrides)) {
    const target = base[section as SectionName];
    if (target && o) Object.assign(target, o);
  }
  return base;
}
