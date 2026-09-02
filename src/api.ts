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

/** anything that can serve the card's data (live client or demo generator) */
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

export class StatsClient implements StatsProvider {
  private cache: Stats | null = null;
  private fetchedAt = 0;
  private histCache: DayHistory[] | null = null;
  private histFetchedAt = 0;
  private readonly baseUrl: string;
  private readonly ttlMs: number;

  constructor(baseUrl: string, ttlMinutes: number) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.ttlMs = ttlMinutes * 60_000;
  }

  async getStats(): Promise<StatsResult> {
    const fresh = this.cache && Date.now() - this.fetchedAt < this.ttlMs;
    if (fresh && this.cache) {
      return { ok: true, stats: this.cache, stale: false };
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/stats`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`stats API HTTP ${res.status}`);
      const json = (await res.json()) as Stats;
      if (!json || !Array.isArray(json.languages)) throw new Error("stats API returned unexpected shape");
      this.cache = json;
      this.fetchedAt = Date.now();
      return { ok: true, stats: json, stale: false };
    } catch (err) {
      console.error("[github-stats-charts] stats fetch failed:", err instanceof Error ? err.message : err);
      if (this.cache) {
        return { ok: true, stats: this.cache, stale: true };
      }
      return { ok: false };
    }
  }

  async getLangHistory(): Promise<LangHistoryResult> {
    const fresh = this.histCache && Date.now() - this.histFetchedAt < this.ttlMs;
    if (fresh && this.histCache) {
      return { ok: true, days: this.histCache, stale: false };
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/lang-history`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`lang-history HTTP ${res.status}`);
      const json = (await res.json()) as { days: DayHistory[] };
      if (!json || !Array.isArray(json.days)) throw new Error("unexpected shape");
      this.histCache = json.days;
      this.histFetchedAt = Date.now();
      return { ok: true, days: json.days, stale: false };
    } catch (err) {
      console.error("[github-stats-charts] lang-history fetch failed:", err instanceof Error ? err.message : err);
      if (this.histCache) {
        return { ok: true, days: this.histCache, stale: true };
      }
      return { ok: false };
    }
  }

  health() {
    return {
      api_url: this.baseUrl,
      cached: this.cache !== null,
      cached_at: this.fetchedAt ? new Date(this.fetchedAt).toISOString() : null,
      snapshot: this.cache?.taken_at ?? null,
    };
  }
}
