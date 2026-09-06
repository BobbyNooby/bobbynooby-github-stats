/**
 * In-process StatsProvider: reads the SQLite database directly instead of
 * going over HTTP. Graphs are capability-gated — they only appear once real
 * history exists, so a fresh install renders a clean card with no graphs and
 * they fade in automatically as data accumulates.
 */
import type {
  DayHistory,
  LangHistoryResult,
  StatsProvider,
  StatsResult,
} from "./types";
import { MIN_HISTORY_DAYS } from "./env";
import { commitHistoryByDay, latestSnapshot } from "./cron/db";
import { statsFromSnapshot } from "./stats-shape";

export interface DbProviderOptions {
  intervalHours: number;
  showGraphs: "auto" | boolean;
}

export class DbProvider implements StatsProvider {
  private readonly intervalHours: number;
  private readonly showGraphs: "auto" | boolean;

  constructor(opts: DbProviderOptions) {
    this.intervalHours = opts.intervalHours;
    this.showGraphs = opts.showGraphs;
  }

  async getStats(): Promise<StatsResult> {
    const row = latestSnapshot();
    if (!row) return { ok: false };
    return { ok: true, stats: statsFromSnapshot(row), stale: this.isStale(row.taken_at) };
  }

  async getLangHistory(): Promise<LangHistoryResult> {
    if (this.showGraphs === false) return { ok: false };
    const days = commitHistoryByDay();
    if (days.length === 0) return { ok: false };
    if (this.showGraphs === "auto" && days.length < MIN_HISTORY_DAYS) {
      return { ok: false };
    }
    return { ok: true, days, stale: false };
  }

  health(): Record<string, unknown> {
    const latest = latestSnapshot();
    return {
      username: undefined, // filled by /health from server options
      graphs:
        this.showGraphs === false
          ? "off (SHOW_GRAPHS=false)"
          : latest
            ? "on"
            : "waiting for data",
      last_snapshot: latest?.taken_at ?? null,
    };
  }

  private isStale(takenAt: string): boolean {
    const ageMs = Date.now() - Date.parse(`${takenAt}T00:00:00Z`);
    return ageMs > this.intervalHours * 3_600_000;
  }
}

export type { DayHistory };
