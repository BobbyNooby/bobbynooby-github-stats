/**
 * ────────────────────────── Make it yours ──────────────────────────
 * Fork-tuning lives HERE. Everything else in src/ is engine.
 *
 * Data sources (what needs what):
 *   • The header, language bar, tiles and totals only need GitHub API
 *     data — your cron instance's /api/stats. Works out of the box.
 *   • The two line graphs additionally need GIT history, which only
 *     github-stats-cron provides (via /api/lang-history, populated by
 *     its backfill). Without it the card renders without the graphs.
 */
export const CONFIG = {
  /** shown after the ">" in the title — e.g. ">yourname" */
  handle: "bobbynooby",

  /** spinning logo, top right (traced vector path in src/logo.ts).
   *  swap `body` there with your own mark, or set enabled: false */
  logo: {
    enabled: true,
    variant: "logo" as "logo" | "dot",
    insetFromRight: 40, // px from the right border; bigger = further left
    y: 23,              // px from the top border (logo's top edge)
    size: 27,           // rendered width/height in px
  },

  /** section toggles */
  showBar: true,
  showGraphs: true,       // needs git history from github-stats-cron
  showAllLanguages: true,
};
