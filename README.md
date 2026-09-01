# github-stats-charts

Stateless SVG chart renderer for [github-stats-cron](https://github.com/your-name/github-stats-cron).
Fetches the JSON stats API, renders embeddable SVGs. No database, no cron — safe to
redeploy/restart at any time.

## Charts

| Route | Description |
|---|---|
| `GET /languages.svg` | Donut chart of your top languages + legend with percentages |
| `GET /health` | Service + upstream API status |

Query params on `/languages.svg`:

- `?theme=light|dark` — color scheme (default `light`, override with `DEFAULT_THEME`)
- `?count=1..10` — how many top languages to show (default `6`, rest grouped as "Other")

Responses carry `Cache-Control: public, max-age=21600` so GitHub's image proxy (camo)
caches them for a few hours instead of hammering your service.

If the stats API is down or has no data yet, a "No data yet" placeholder SVG is served
instead of an error — safe to embed on day one.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `STATS_API_URL` | yes | — | Base URL of your github-stats-cron instance |
| `PORT` | no | `3001` | HTTP port |
| `CACHE_TTL_MINUTES` | no | `60` | In-memory cache TTL for stats fetches |
| `DEFAULT_THEME` | no | `light` | Used when `?theme=` is absent |

## Run locally (Bun)

```sh
cp .env.example .env   # point STATS_API_URL at your stats service
bun install
bun run dev
```

## Run with Docker

```sh
cp .env.example .env
docker compose up -d --build
```

## Deploy on Coolify

1. New resource → Docker Compose / Dockerfile → this repo
2. Set `STATS_API_URL` — either your stats service's public domain or the internal
   Coolify hostname (e.g. `http://github-stats-cron:3000`)
3. Expose port 3001, give it a domain (e.g. `charts.yourdomain.dev`)

## Embed in your GitHub profile README

In your `username/username` repo:

```md
![My top languages](https://charts.yourdomain.dev/languages.svg)
```

Auto dark/light switching (GitHub renders READMEs in both modes):

```md
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://charts.yourdomain.dev/languages.svg?theme=dark" />
  <source media="(prefers-color-scheme: light)" srcset="https://charts.yourdomain.dev/languages.svg?theme=light" />
  <img alt="My top languages" src="https://charts.yourdomain.dev/languages.svg" />
</picture>
```

## Customizing the design

Everything visual lives in `src/charts/languages.ts` (~120 lines, no chart library —
raw SVG path math). Change colors, layout, chart type, whatever — it's your renderer.
