# bobbynooby-github-stats

One self-hosted service, your whole GitHub-stats card. A daily cron snapshots
your public GitHub stats (languages, stars, forks, followers) into SQLite, and
the same service serves:

- **`/languages.svg`** — an animated profile card: language bar, logo tiles,
  cumulative lines-of-code and language-share graphs (see it live at `/demo`)
- **`/api/*`** — a small JSON API over your stats history (`/swagger` for docs)

GitHub does **not** keep historical language/star data — this snapshots it
yourself, so history starts accumulating from day one.

## Fork it in 3 steps

```sh
cp .env.example .env       # 1. set GITHUB_USERNAME (that's the only required var)
docker compose up -d --build   # 2. build + run
```

3. Point the embed below at your domain. Everything else — handle, theme,
   logo, animation — is env config (see `.env.example`), no code edits needed.

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://your-domain/languages.svg?theme=dark" />
  <source media="(prefers-color-scheme: light)" srcset="https://your-domain/languages.svg?theme=light" />
  <img alt="coding stats" src="https://your-domain/languages.svg" />
</picture>
```

Since `DEFAULT_THEME=auto`, a single `<img src=".../languages.svg">` also works:
the SVG carries both palettes and follows the viewer's OS appearance where the
renderer supports it (the `<picture>` form is the guaranteed-everywhere path).

## What the card shows

830px wide, five sections: header with totals → language bar → logo tiles with
percentages → two daily line graphs (cumulative lines of code, language share
over time) → every language ever committed, as tiles. Everything animates in
sequence and collapses to instant rendering under `prefers-reduced-motion`.

**Graphs need history.** They're driven by your git history (per day, lines and
commits per language, computed from bare clones kept next to the database). A
fresh install has none, so the card automatically renders without the graphs
and they appear once ≥ 14 days exist. Force with `SHOW_GRAPHS=true|false`.

## The built-in cron

There's nothing to schedule — the service does it all itself:

1. **On boot** it takes a snapshot (GitHub API → `snapshots` table) and syncs
   git history (clones your public repos once, then just fetches →
   `commit_history` table). First launch backfills everything automatically.
2. **Every hour** it re-ingests only if the last snapshot is older than
   `INTERVAL_HOURS` (default 24). That's the only knob; failures never crash
   the server — it keeps serving the last snapshot.

Prefer your system's cron? `bun run ingest` takes one snapshot and exits —
point crontab at it and skip the built-in scheduler entirely.

## Configuration

Only `GITHUB_USERNAME` is required — every other knob is optional with a
working default. The full annotated list lives in [`.env.example`](./.env.example):

| | |
|---|---|
| `GITHUB_USERNAME` | **required** — your GitHub login |
| `GITHUB_TOKEN` | any PAT, no scopes: 1-request GraphQL snapshots + official colors |
| `INCLUDE_PRIVATE` | `false` (default). `true` leaks private-repo stats into the **public** SVG — needs a scoped token, think twice |
| `HANDLE`, `LOGO`, `LOGO_SIZE/Y/INSET` | branding |
| `DEFAULT_THEME`, `SHOW_BAR`, `SHOW_GRAPHS`, `SHOW_ALL_LANGUAGES` | layout (`SHOW_GRAPHS=auto` by default) |
| `ANIMATION_PRESET`, `ANIMATION_SPEED`, `ANIMATION_<SECTION>_<FIELD>` | motion |
| `PORT`, `DB_PATH`, `INTERVAL_HOURS`, `CORS_ORIGIN`, `API_SECRET`, `REFRESH_SECRET` | service |
| `DEMO`, `GITHUB_API_BASE`, `GITHUB_API_URL` | development |

Query params override per-embed: `?theme=auto|light|dark`, `?count=1..10`
(languages in the bar; rest grouped as Other).

## Your logo

Drop a self-contained SVG at `assets/logo.svg` and it replaces the built-in
mark (spinning in the top-right corner). It's sanitized on load (scripts,
event handlers and external references are stripped), scaled to fit, and
centered — multicolor marks keep their colors. `LOGO=dot` for a pulsing dot
instead, `LOGO=none` to remove it. Without a file, the built-in mark renders.

## Local development (Bun)

```sh
cp .env.example .env
bun install
bun run dev          # server + scheduler, real data
bun test             # unit tests
DEMO=true bun run dev        # deterministic stub data, zero network — /demo to preview
bun run mock &               # fake GitHub API on :9999
GITHUB_API_BASE=http://localhost:9999 GITHUB_API_URL=http://localhost:9999/graphql \
  GITHUB_USERNAME=mockuser DB_PATH=/tmp/t.db bun run dev
bun run ingest       # one-shot snapshot, then exit (for system-cron users)
```

## Deploy

Any Docker host works; on [Coolify](https://coolify.io): new resource → Docker
Compose → this repo → set `GITHUB_USERNAME` → attach a persistent volume at
`/data` (the compose file already mounts `./data`) → expose port 3000.

## Storage model

```sql
snapshots(taken_at PK, raw_json, languages, total_stars, total_forks, followers, repo_count)
commit_history(day, language, commits, added, deleted)   -- PK (day, language)
```

- `snapshots` — one row per day from the GitHub API; same-day re-runs UPSERT.
  Raw responses kept for future re-analysis.
- `commit_history` — aggregated from git history; recomputed on every sync
  (idempotent, self-healing). Bare clones persist in `<db_dir>/stats-clones`,
  so daily syncs only fetch new commits.

Schema migrations run automatically on boot — no manual steps.

## Ingestion modes

| | `GITHUB_TOKEN` set | no token |
|---|---|---|
| API | GraphQL (1 request/snapshot) | REST (~1 request per repo, chunked) |
| Rate limit | 5,000 req/hr | 60 req/hr — fine for daily snapshots |
| Contribution calendar | included | not available (`null`) |
| Language colors | from GitHub | bundled linguist color map |

Private repos are **always excluded** unless you explicitly set
`INCLUDE_PRIVATE=true` — even a scoped token can't leak them in by accident.

## Language coverage

Language identification, colors and logos are powered by the full
[github/linguist](https://github.com/github-linguist/linguist) dataset
(MIT, © GitHub): extension→language mapping for git-history classification,
official colors for ~690 languages, and ~90 auto-matched logo paths from
[simple-icons](https://simpleicons.org) (CC0) with hand-curated overrides.

## Credits

- [simple-icons](https://simpleicons.org) — language logos (CC0)
- [Font Awesome](https://fontawesome.com) — Java coffee cup (CC BY 4.0)
- [Lucide](https://lucide.dev) — star/fork/person icons (ISC)
- [Cascadia Code](https://github.com/microsoft/cascadia-code) (SIL OFL 1.1),
  [Quicksand](https://fonts.google.com/specimen/Quicksand) (SIL OFL 1.1)

## License

Code is [MIT](./LICENSE). Embedded third-party assets (logos, icons, fonts)
keep their own licenses — see [Credits](#credits).
