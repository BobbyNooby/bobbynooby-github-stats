import { describe, expect, test } from "bun:test";
import { DbProvider } from "./provider";
import { initDb, upsertCommitHistory, upsertSnapshot } from "./cron/db";

initDb(":memory:");

function seedSnapshot(takenAt: string) {
  upsertSnapshot({
    taken_at: takenAt,
    raw_json: "{}",
    languages: JSON.stringify({
      TypeScript: { bytes: 750, color: "#3178c6" },
      Rust: { bytes: 250, color: "#dea584" },
    }),
    total_stars: 12,
    total_forks: 3,
    followers: 9,
    repo_count: 4,
  });
}

function seedHistory(days: number) {
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < days; i++) {
    const day = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    upsertCommitHistory({ day, language: "TypeScript", commits: 2, added: 100, deleted: 10 });
    upsertCommitHistory({ day, language: "Rust", commits: 1, added: 40, deleted: 5 });
  }
}

const today = new Date().toISOString().slice(0, 10);

describe("DbProvider", () => {
  test("empty database: everything reports no data", async () => {
    const p = new DbProvider({ intervalHours: 24, showGraphs: "auto" });
    expect(await p.getStats()).toEqual({ ok: false });
    expect(await p.getLangHistory()).toEqual({ ok: false });
  });

  test("getStats maps the snapshot row to the public shape", async () => {
    seedSnapshot(today);
    const p = new DbProvider({ intervalHours: 24, showGraphs: "auto" });
    const r = await p.getStats();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.stats.taken_at).toBe(today);
    expect(r.stats.totals).toEqual({ stars: 12, forks: 3, followers: 9, repos: 4 });
    expect(r.stats.languages.map((l) => l.name)).toEqual(["TypeScript", "Rust"]);
    expect(r.stats.languages[0].pct).toBeCloseTo(75, 5);
    expect(r.stats.languages[0].color).toBe("#3178c6");
  });

  test("history shorter than MIN_HISTORY_DAYS is hidden in auto mode", async () => {
    seedHistory(5);
    const p = new DbProvider({ intervalHours: 24, showGraphs: "auto" });
    expect(await p.getLangHistory()).toEqual({ ok: false });
  });

  test("history at/over the threshold shows in auto mode, days passed through", async () => {
    seedHistory(20);
    const p = new DbProvider({ intervalHours: 24, showGraphs: "auto" });
    const r = await p.getLangHistory();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.days.length).toBe(20);
    expect(r.days[0].languages.length).toBe(2);
  });

  test("SHOW_GRAPHS=true forces short history on", async () => {
    const p = new DbProvider({ intervalHours: 24, showGraphs: true });
    const r = await p.getLangHistory();
    expect(r.ok).toBe(true);
  });

  test("SHOW_GRAPHS=false keeps even full history off", async () => {
    const p = new DbProvider({ intervalHours: 24, showGraphs: false });
    expect(await p.getLangHistory()).toEqual({ ok: false });
  });

  test("stale flag follows INTERVAL_HOURS", async () => {
    seedSnapshot(today);
    const fresh = new DbProvider({ intervalHours: 24, showGraphs: "auto" });
    const r = await fresh.getStats();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stale).toBe(false);

    const stale = new DbProvider({ intervalHours: 0, showGraphs: "auto" });
    const r2 = await stale.getStats();
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.stale).toBe(true);
  });
});
