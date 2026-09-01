import { StatsClient } from "./api";
import { createServer } from "./server";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function log(...args: unknown[]) {
  console.log("[github-stats-charts]", ...args);
}

const STATS_API_URL = env("STATS_API_URL");
const PORT = Number(env("PORT") ?? 3001);
const CACHE_TTL_MINUTES = Number(env("CACHE_TTL_MINUTES") ?? 60);
const DEFAULT_THEME = env("DEFAULT_THEME") === "dark" ? "dark" : "light";

if (!STATS_API_URL) {
  console.error("[github-stats-charts] STATS_API_URL is required (e.g. https://stats.example.com)");
  process.exit(1);
}

const client = new StatsClient(STATS_API_URL, CACHE_TTL_MINUTES);
const app = createServer(client, DEFAULT_THEME);
app.listen(PORT);

log(`serving on http://localhost:${app.server?.port} → ${STATS_API_URL} (cache ${CACHE_TTL_MINUTES}m, theme ${DEFAULT_THEME})`);
