import { Elysia } from "elysia";
import { DemoProvider } from "./demo";
import type { StatsProvider } from "./api";
import { languagesChart } from "./charts/languages";

const CACHE_CONTROL = "public, max-age=21600";

function svg(res: string): Response {
  return new Response(res, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export function createServer(client: StatsProvider, defaultTheme: "light" | "dark") {
  // demo data is deterministic — one provider for the whole process
  const demoProvider = new DemoProvider();
  const themeAndCount = ({ query }: { query: Record<string, string | undefined> }) => {
    const theme = query.theme === "dark" || query.theme === "light" ? query.theme : defaultTheme;
    const countParam = Number(query.count ?? 6);
    const count = Number.isFinite(countParam) ? Math.min(Math.max(Math.trunc(countParam), 1), 10) : 6;
    return { theme, count };
  };

  return new Elysia({ name: "github-stats-charts" })
    .get("/languages.svg", async ({ query }) => {
      const { theme, count } = themeAndCount({ query });
      const [stats, history] = await Promise.all([client.getStats(), client.getLangHistory()]);
      return svg(
        languagesChart(
          stats.ok ? stats.stats : null,
          history.ok ? { days: history.days } : null,
          { theme, count }
        )
      );
    })
    .get("/demo.svg", async ({ query }) => {
      const theme = query.theme === "dark" || query.theme === "light" ? query.theme : defaultTheme;
      const countParam = Number(query.count ?? 6);
      const count = Number.isFinite(countParam) ? Math.min(Math.max(Math.trunc(countParam), 1), 10) : 6;
      const [history, stats] = await Promise.all([
        demoProvider.getLangHistory(),
        demoProvider.getStats(),
      ]);
      return svg(
        languagesChart(
          stats.ok ? stats.stats : null,
          { days: history.ok ? history.days : [] },
          { theme, count }
        )
      );
    })
    .get("/demo", () => {
      const base = "";
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>demo card</title>
<style>body{background:#0a0b10;color:#e8eaf2;font-family:-apple-system,sans-serif;padding:32px}
img{width:830px;max-width:100%;display:block;margin-bottom:24px;border-radius:8px}
.dark{background:#0d1117;padding:8px}.light{background:#ffffff;padding:8px}
p{font-size:13px;color:#8a8fa3}</style></head><body>
<p>demo card — deterministic stub data, dark theme</p>
<img class="dark" src="${base}/demo.svg?theme=dark">
<p>demo card — light theme</p>
<img class="light" src="${base}/demo.svg?theme=light">
</body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    })
    .get("/health", async () => {
      const result = await client.getStats();
      return {
        ok: true,
        api_reachable: result.ok,
        serving_stale: result.ok && result.stale,
        ...client.health(),
      };
    });
}
