import type { DayHistory, LangHistoryResult, Stats, StatsResult } from "./api";
import { LINGUIST_COLORS } from "./linguist-colors";
import { hasLogo } from "./charts/parts";

/**
 * Deterministic demo dataset — no GitHub API, no cron, no database.
 * Enable with DEMO=true. Cumulative growth per language is a logistic
 * ramp with sinusoidal wobble so the line graphs look organic.
 *
 * Includes EVERY language that has a logo, so /demo.svg doubles as a
 * logo test page.
 */

// every logo'd language, alphabetically; onset/rate/phase derived from index
const ALL_LOGO_LANGS = Object.keys(LINGUIST_COLORS).filter(hasLogo).sort();
const DEMO_LANGS = ALL_LOGO_LANGS.map((name, i) => ({
  name,
  onset: (i / ALL_LOGO_LANGS.length) * 0.8,
  rate: 0.3 + (((i * 37) % 100) / 100) * 1.1,
  phase: (((i * 53) % 100) / 100) * Math.PI * 2,
}));

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 1000;
const rand = mulberry32(42);

function buildDays(): DayHistory[] {
  const days: DayHistory[] = [];
  const cum: Record<string, number> = {};
  // per-language spike schedule: a few burst days (deterministic)
  const spikes: Record<string, Set<number>> = {};
  const startMs = Date.parse("2024-01-01T00:00:00Z");
  for (const lang of DEMO_LANGS) {
    const set = new Set<number>();
    for (let k = 0; k < 6; k++) {
      set.add(Math.floor(lang.onset * DAYS + rand() * DAYS * 0.7));
    }
    spikes[lang.name] = set;
  }

  for (let i = 0; i < DAYS; i++) {
    const t = i / DAYS;
    const langs: DayHistory["languages"] = [];
    for (const lang of DEMO_LANGS) {
      if (t < lang.onset) continue;
      const local = (t - lang.onset) / (1 - lang.onset || 1);
      const ramp = Math.min(1, local * 4); // quick ramp after onset
      const wave = 0.55 + 0.45 * Math.sin(2 * Math.PI * (t * 3.2 + lang.phase));
      let added = Math.round(lang.rate * 45 * ramp * (0.35 + 0.65 * wave) * (0.6 + 0.8 * rand()));
      if (spikes[lang.name]?.has(i)) added = Math.round(lang.rate * 400 * (0.5 + rand()));
      if (added <= 0) continue;
      cum[lang.name] = (cum[lang.name] ?? 0) + added;
      langs.push({ language: lang.name, commits: 1 + Math.floor(rand() * 3), added, deleted: Math.floor(added * 0.3 * rand()) });
    }
    if (langs.length === 0) continue;
    days.push({
      day: new Date(startMs + i * 86_400_000).toISOString().slice(0, 10),
      languages: langs,
    });
  }
  return days;
}

const DEMO_DAYS = buildDays();

export class DemoProvider {
  async getStats(): Promise<StatsResult> {
    const latest = DEMO_DAYS.at(-1)!;
    const grand = latest.languages.reduce((s, l) => s + l.added, 0);
    const languages = latest.languages
      .map((l) => ({
        name: l.language,
        bytes: l.added,
        color: LINGUIST_COLORS[l.language] ?? "#8b949e",
        pct: grand > 0 ? (l.added / grand) * 100 : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);
    const stats: Stats = {
      taken_at: latest.day,
      languages,
      totals: { stars: 47, forks: 19, followers: 13, repos: DEMO_LANGS.length },
    };
    return { ok: true, stats, stale: false };
  }

  async getLangHistory(): Promise<LangHistoryResult> {
    return { ok: true, days: DEMO_DAYS, stale: false };
  }

  health() {
    return {
      ok: true,
      demo: true,
      api_url: "(demo data)",
      cached: true,
      snapshot: DEMO_DAYS.at(-1)?.day ?? null,
    };
  }
}
