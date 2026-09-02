import type { DayHistory, LangHistoryResult, Stats, StatsResult } from "./api";
import { LINGUIST_COLORS } from "./linguist-colors";

/**
 * Deterministic demo dataset — no GitHub API, no cron, no database.
 * Enable with DEMO=true. Cumulative growth per language is a logistic
 * ramp with sinusoidal wobble so the line graphs look organic.
 */

// name, onset (fraction of the timeline), growth rate, sine phase
const DEMO_LANGS: { name: string; onset: number; rate: number; phase: number }[] = [
  { name: "JavaScript", onset: 0.0, rate: 1.0, phase: 0.3 },
  { name: "TypeScript", onset: 0.15, rate: 1.3, phase: 1.1 },
  { name: "Python", onset: 0.0, rate: 0.45, phase: 2.2 },
  { name: "Go", onset: 0.3, rate: 0.5, phase: 0.7 },
  { name: "Rust", onset: 0.6, rate: 0.4, phase: 1.9 },
  { name: "Svelte", onset: 0.22, rate: 1.1, phase: 3.0 },
  { name: "C#", onset: 0.42, rate: 0.7, phase: 4.0 },
  { name: "Java", onset: 0.08, rate: 0.5, phase: 2.6 },
  { name: "Kotlin", onset: 0.55, rate: 0.35, phase: 5.0 },
  { name: "Zig", onset: 0.78, rate: 0.3, phase: 0.4 },
  { name: "Lua", onset: 0.38, rate: 0.3, phase: 2.9 },
  { name: "Dart", onset: 0.5, rate: 0.28, phase: 4.4 },
  { name: "Elixir", onset: 0.66, rate: 0.26, phase: 1.5 },
  { name: "Haskell", onset: 0.72, rate: 0.2, phase: 3.3 },
  { name: "Shell", onset: 0.04, rate: 0.4, phase: 5.5 },
  { name: "HTML", onset: 0.01, rate: 0.9, phase: 0.9 },
  { name: "CSS", onset: 0.02, rate: 0.75, phase: 2.0 },
  { name: "Markdown", onset: 0.06, rate: 0.55, phase: 4.8 },
  { name: "Docker", onset: 0.3, rate: 0.35, phase: 1.8 },
  { name: "GraphQL", onset: 0.58, rate: 0.22, phase: 3.7 },
];

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
