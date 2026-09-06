/**
 * github-stats: one service that snapshots GitHub stats into SQLite,
 * serves the JSON API (/api/*, /swagger) and the animated SVG card
 * (/languages.svg). Only GITHUB_USERNAME is required — see .env.example.
 */
import type { StatsProvider } from "./types";
import { createApp } from "./app";
import { loadConfig } from "./env";
import { DbProvider } from "./provider";
import { initDb, latestSnapshot } from "./cron/db";
import { ingest } from "./cron/ingest";
import { syncCommitHistory } from "./cron/history-sync";
import { DemoProvider } from "./card/demo";

function log(...args: unknown[]) {
  console.log("[github-stats]", ...args);
}

const config = loadConfig();
const ingestOnly = process.argv.includes("--ingest-only");

const runIngest = async (): Promise<void> => {
  try {
    const result = await ingest(config.username, config.token, {
      apiBase: config.githubApiBase,
      apiUrl: config.githubApiUrl,
      includePrivate: config.includePrivate,
    });
    log(
      `snapshot saved (${result.mode}): ${result.taken_at} — ${result.repos_fetched} repos, ${result.languages} languages`
    );
  } catch (err) {
    log("ingest failed, keeping last snapshot:", err instanceof Error ? err.message : err);
  }
  // the git-history table rides along with every snapshot cycle
  await syncCommitHistory(config.username, config.dbPath, config.githubApiBase, config.token);
};

let provider: StatsProvider;

if (config.demo) {
  if (ingestOnly) {
    log("--ingest-only has nothing to do in DEMO mode");
    process.exit(0);
  }
  // in-memory db so the JSON API answers with clean 404s instead of 500s
  initDb(":memory:");
  provider = new DemoProvider();
  log("DEMO MODE — serving generated stub data (no upstream API calls)");
} else {
  initDb(config.dbPath);
  if (!config.token) {
    log(
      "no GITHUB_TOKEN set — using unauthenticated REST (60 req/hr, fine for daily snapshots).",
      "Set GITHUB_TOKEN to switch to GraphQL (1 req/day, includes contribution history)."
    );
  }
  if (config.includePrivate) {
    log("INCLUDE_PRIVATE=true — private-repo stats WILL be visible in the public SVG");
  }

  if (ingestOnly) {
    await runIngest();
    process.exit(0);
  }

  log("taking startup snapshot...");
  await runIngest();

  provider = new DbProvider({
    intervalHours: config.intervalHours,
    showGraphs: config.showGraphs,
  });
}

const app = createApp(config, provider);
try {
  app.listen(config.port);
} catch {
  console.error(
    `[github-stats] port ${config.port} is already in use — set PORT in .env to something free`
  );
  process.exit(1);
}

log(
  `serving on http://localhost:${app.server?.port} ` +
    `(db: ${config.demo ? "demo" : config.dbPath}, interval: ${config.intervalHours}h,` +
    ` theme: ${config.theme}, api: ${config.apiSecret ? "private (API_SECRET)" : "public"}, docs: /swagger)`
);

if (!config.demo) {
  const isStale = (): boolean => {
    const latest = latestSnapshot();
    if (!latest) return true;
    const ageMs = Date.now() - Date.parse(`${latest.taken_at}T00:00:00Z`);
    return ageMs > config.intervalHours * 3_600_000;
  };
  const CHECK_MS = 60 * 60 * 1000;
  setInterval(() => {
    if (isStale()) {
      log("snapshot stale, ingesting...");
      void runIngest();
    }
  }, CHECK_MS);
}
