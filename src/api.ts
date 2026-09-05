/**
 * The card renders from anything that can answer these two questions.
 * Implementations: DbProvider (in-process SQLite, src/provider.ts) and
 * DemoProvider (deterministic stubs, src/demo.ts).
 */
export interface LangHistoryEntry {
  language: string;
  commits: number;
  added: number;
  deleted: number;
}

export interface DayHistory {
  day: string;
  languages: LangHistoryEntry[];
}

export type LangHistoryResult =
  | { ok: true; days: DayHistory[]; stale: boolean }
  | { ok: false };

/** anything that can serve the card's data (in-process db or demo generator) */
export interface StatsProvider {
  getStats(): Promise<StatsResult>;
  getLangHistory(): Promise<LangHistoryResult>;
  health(): Record<string, unknown>;
}

export interface Stats {
  taken_at: string;
  languages: LangStat[];
  totals: { stars: number; forks: number; followers: number; repos: number };
}

export interface LangStat {
  name: string;
  bytes: number;
  color: string;
  pct: number;
}

export type StatsResult =
  | { ok: true; stats: Stats; stale: boolean }
  | { ok: false };
