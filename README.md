# bobbynooby-github-stats

Animated GitHub profile card for [@BobbyNooby](https://github.com/BobbyNooby).
One self-contained SVG (`languages.svg`), served live by a tiny Elysia service and
rendered from the data of a
[github-stats-cron](https://github.com/BobbyNooby/github-stats-cron) instance.

## What the card shows

830px wide, five sections, top to bottom:

1. **Header** — `>bobbynooby` wordmark + star / fork / follower counts
2. **Language bar** — current allocation across public repos, load-in fill
3. **Tiles + percentages** — the bar's languages as logo tiles, Other last
4. **Two daily line graphs** — cumulative lines of code over time, and each
   language's share of total code over time (git-history data, year ticks)
5. **Every language** — all languages ever committed, as logo tiles

Everything animates in sequence (totals rise → bar fills → tiles pop → curves
draw themselves) and collapses to instant rendering under
`prefers-reduced-motion`. Both dark and light themes via query param.

## Endpoints

| Route | Description |
|---|---|
| `GET /languages.svg` | The full profile card |
| `GET /health` | Service + upstream API status |

Query params on `/languages.svg`:

- `?theme=light|dark` (default `light`, override with `DEFAULT_THEME`)
- `?count=1..10` — how many languages in the bar section (default `6`, rest
  grouped as Other)

Responses carry `Cache-Control: public, max-age=21600` so GitHub's image proxy
(camo) caches them for a few hours — the chart content itself only changes when
the cron takes its daily snapshot.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `STATS_API_URL` | yes | — | Base URL of your github-stats-cron instance |
| `PORT` | no | `3001` | HTTP port |
| `CACHE_TTL_MINUTES` | no | `60` | In-memory cache for upstream API responses |
| `DEFAULT_THEME` | no | `light` | Used when `?theme=` is absent |

## Run locally (Bun)

```sh
cp .env.example .env   # point STATS_API_URL at a github-stats-cron instance
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
2. Set `STATS_API_URL` — your cron's public domain or internal Coolify hostname
   (e.g. `http://github-stats-cron:3000`)
3. Expose port 3001, attach a domain (e.g. `githubstats.bobbynooby.dev`)

## Embed in your GitHub profile README

In your `username/username` repo:

```md
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://your-domain/languages.svg?theme=dark" />
  <source media="(prefers-color-scheme: light)" srcset="https://your-domain/languages.svg?theme=light" />
  <img alt="coding stats" src="https://your-domain/languages.svg" />
</picture>
```

Bump a `?v=2` cache-buster on the URL whenever you change the design, or camo
will keep serving the old SVG for a few hours.

## Customizing

- Layout, bar, graphs, choreography: `src/charts/languages.ts`
- Shared pieces (themes, icons, logo tiles): `src/charts/parts.ts`
- Language logos: `src/logos.ts` — paths from
  [simple-icons](https://simpleicons.org) (CC0); logo-less languages are
  omitted from the tile rows
- Title fonts: Cascadia Code + Quicksand subsets, base64-embedded in
  `src/font.ts` (external font loads are blocked inside `<img>` SVGs)

## Credits

- [simple-icons](https://simpleicons.org) — language logos (CC0)
- [Font Awesome](https://fontawesome.com) — Java coffee cup (CC BY 4.0)
- [Lucide](https://lucide.dev) — star/fork/person icons (ISC)
- [Cascadia Code](https://github.com/microsoft/cascadia-code) (SIL OFL 1.1),
  [Quicksand](https://fonts.google.com/specimen/Quicksand) (SIL OFL 1.1)

## License

Code is [MIT](./LICENSE). Embedded third-party assets (logos, icons, fonts)
keep their own licenses — see [Credits](#credits).
