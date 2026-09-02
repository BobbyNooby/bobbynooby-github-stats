import { StatsClient, type StatsProvider } from "./api";
import { DemoProvider } from "./demo";
import { createServer } from "./server";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function log(...args: unknown[]) {
  console.log("[github-stats-charts]", ...args);
}

const DEMO = env("DEMO") === "true";
const STATS_API_URL = env("STATS_API_URL");
const PORT = Number(env("PORT") ?? 3001);
const CACHE_TTL_MINUTES = Number(env("CACHE_TTL_MINUTES") ?? 60);
const DEFAULT_THEME = env("DEFAULT_THEME") === "dark" ? "dark" : "light";

let provider: StatsProvider;
if (DEMO) {
  provider = new DemoProvider();
  log("DEMO MODE — serving generated stub data (no upstream API calls)");
} else {
  if (!STATS_API_URL) {
    console.error(
      "[github-stats-charts] STATS_API_URL is required (or set DEMO=true to preview with stub data)"
    );
    process.exit(1);
  }
  provider = new StatsClient(STATS_API_URL, CACHE_TTL_MINUTES);
}

const app = createServer(provider, DEFAULT_THEME);
app.listen(PORT);

log(
  DEMO
    ? `serving on http://localhost:${app.server?.port} (demo data, theme ${DEFAULT_THEME})`
    : `serving on http://localhost:${app.server?.port} → ${STATS_API_URL} (cache ${CACHE_TTL_MINUTES}m, theme ${DEFAULT_THEME})`
);
