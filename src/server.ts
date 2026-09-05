import { Elysia } from "elysia";
import { DemoProvider } from "./demo";
import type { StatsProvider } from "./api";
import { languagesChart } from "./charts/languages";

const CACHE_CONTROL = "public, max-age=21600";

const THEMES = ["auto", "light", "dark"] as const;
type ThemeParam = (typeof THEMES)[number];

function svg(res: string): Response {
  return new Response(res, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

function pickTheme(query: string | undefined, defaultTheme: ThemeParam): ThemeParam {
  return THEMES.includes((query ?? "") as ThemeParam) ? ((query ?? "") as ThemeParam) : defaultTheme;
}

function pickCount(query: string | undefined): number {
  const n = Number(query ?? 6);
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 1), 10) : 6;
}

export function createServer(client: StatsProvider, defaultTheme: ThemeParam) {
  // demo data is deterministic — one provider for the whole process
  const demoProvider = new DemoProvider();

  return new Elysia({ name: "card" })
    .get("/languages.svg", async ({ query }) => {
      const theme = pickTheme(query.theme, defaultTheme);
      const count = pickCount(query.count);
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
      const theme = pickTheme(query.theme, defaultTheme);
      const count = pickCount(query.count);
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
<p>demo card — deterministic stub data, auto theme (follows your OS appearance)</p>
<img class="light" src="${base}/demo.svg?theme=auto">
<p>forced dark</p>
<img class="dark" src="${base}/demo.svg?theme=dark">
<p>forced light</p>
<img class="light" src="${base}/demo.svg?theme=light">
</body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    });
}
