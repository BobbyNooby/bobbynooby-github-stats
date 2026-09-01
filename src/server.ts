import { Elysia } from "elysia";
import type { StatsClient } from "./api";
import { languagesChart } from "./charts/languages";
import { evolutionChart } from "./charts/evolution";

const CACHE_CONTROL = "public, max-age=21600";

function svg(res: string): Response {
  return new Response(res, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export function createServer(client: StatsClient, defaultTheme: "light" | "dark") {
  const themeAndCount = ({ query }: { query: Record<string, string | undefined> }) => {
    const theme = query.theme === "dark" || query.theme === "light" ? query.theme : defaultTheme;
    const countParam = Number(query.count ?? 6);
    const count = Number.isFinite(countParam) ? Math.min(Math.max(Math.trunc(countParam), 1), 10) : 6;
    return { theme, count };
  };

  return new Elysia({ name: "github-stats-charts" })
    .get("/languages.svg", async ({ query }) => {
      const { theme, count } = themeAndCount({ query });
      const result = await client.getStats();
      return svg(languagesChart(result.ok ? result.stats : null, { theme, count }));
    })
    .get("/evolution.svg", async ({ query }) => {
      const { theme, count } = themeAndCount({ query });
      const durParam = Number(query.dur ?? 0);
      const dur = Number.isFinite(durParam) ? Math.min(Math.max(Math.trunc(durParam), 0), 60) : 0;
      const [history, stats] = await Promise.all([client.getLangHistory(), client.getStats()]);
      return svg(
        evolutionChart(history.ok ? { months: history.months } : null, stats.ok ? stats.stats : null, {
          theme,
          count,
          dur,
        })
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
