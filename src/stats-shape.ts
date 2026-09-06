/**
 * Shared mapping from the stored snapshot row to the public /api/stats shape.
 * Used by both the JSON API route and the in-process card provider so the two
 * can never disagree.
 */
import type { LangStat, Stats } from "./types";
import type { SnapshotRow } from "./cron/db";

export function statsFromSnapshot(row: SnapshotRow): Stats {
  const langs: Record<string, { bytes: number; color: string }> = JSON.parse(row.languages);
  const totalBytes = Object.values(langs).reduce((sum, l) => sum + l.bytes, 0);
  const languages: LangStat[] = Object.entries(langs)
    .map(([name, { bytes, color }]) => ({
      name,
      bytes,
      color,
      pct: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);
  return {
    taken_at: row.taken_at,
    languages,
    totals: {
      stars: row.total_stars,
      forks: row.total_forks,
      followers: row.followers,
      repos: row.repo_count,
    },
  };
}
