import { Elysia } from "elysia";
import type { StatsClient } from "./api";
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

export function createServer(client: StatsClient, defaultTheme: "light" | "dark") {
  return new Elysia({ name: "github-stats-charts" })
    .get("/languages.svg", async ({ query }) => {
      const theme = query.theme === "dark" || query.theme === "light" ? query.theme : defaultTheme;
      const countParam = Number(query.count ?? 6);
      const count = Number.isFinite(countParam) ? Math.min(Math.max(Math.trunc(countParam), 1), 10) : 6;
      const result = await client.getStats();
      return svg(
        languagesChart(result.ok ? result.stats : null, {
          theme,
          count,
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
