import type { Stats } from "../api";

export interface Theme {
  bg: string;
  border: string;
  text: string;
  muted: string;
  other: string;
}

const THEMES: Record<"light" | "dark", Theme> = {
  light: { bg: "#ffffff", border: "#d0d7de", text: "#24292f", muted: "#57606a", other: "#8b949e" },
  dark: { bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#8b949e", other: "#6e7681" },
};

const WIDTH = 340;
const HEIGHT = 200;
const CX = 245;
const CY = 108;
const R_OUTER = 62;
const R_INNER = 37;
const R_MID = (R_OUTER + R_INNER) / 2;
const STROKE_W = R_OUTER - R_INNER;
const CIRC = 2 * Math.PI * R_MID;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

interface Slice {
  name: string;
  color: string;
  pct: number;
}

const STYLE = `<style>
  .sweep { animation: sweep .7s cubic-bezier(.4,0,.2,1) both; }
  .fade { animation: fadein .4s ease-out both; }
  .pulse { animation: pulse 2.4s ease-in-out 1.4s infinite; }
  @keyframes sweep { from { stroke-dasharray: 0 var(--c); } }
  @keyframes fadein { from { opacity: 0; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) {
    .sweep, .fade { animation-duration: .01s; }
    .pulse { animation: none; }
  }
</style>`;

function card(theme: Theme, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<style>text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }</style>
${STYLE}
<rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="6" fill="${theme.bg}" stroke="${theme.border}"/>
${body}
</svg>`;
}

export function languagesChart(
  stats: Stats | null,
  opts: { theme: "light" | "dark"; count: number }
): string {
  const theme = THEMES[opts.theme];

  if (!stats || stats.languages.length === 0) {
    return card(
      theme,
      `<text class="fade" x="24" y="52" font-size="20" font-weight="600" fill="${theme.text}">GitHub Stats</text>
<text class="fade" style="animation-delay:.15s" x="24" y="92" font-size="14" fill="${theme.muted}">No data yet — collecting stats.</text>
<text class="fade" style="animation-delay:.3s" x="24" y="114" font-size="13" fill="${theme.muted}">Check back after the first snapshot.</text>`
    );
  }

  const top = stats.languages.slice(0, opts.count);
  const rest = stats.languages.slice(opts.count);
  const slices: Slice[] = top.map((l) => ({ name: l.name, color: l.color, pct: l.pct }));
  if (rest.length > 0) {
    slices.push({
      name: "Other",
      color: theme.other,
      pct: rest.reduce((sum, l) => sum + l.pct, 0),
    });
  }

  let body = `<circle class="pulse" cx="${WIDTH - 26}" cy="35" r="5" fill="#3fb950"/>
<text class="fade" x="24" y="42" font-size="20" font-weight="600" fill="${theme.text}">Top Languages</text>`;

  body += `<g class="fade" style="animation-delay:.05s">`;
  body += `<g transform="rotate(-90 ${CX} ${CY})" style="--c:${CIRC.toFixed(2)}">`;

  let startDeg = 0;
  const SLICE_DUR = 0.7;
  slices.forEach((s, i) => {
    const len = (s.pct / 100) * CIRC;
    const sweepDeg = (s.pct / 100) * 360;
    const delay = (i * SLICE_DUR * 0.4).toFixed(2);
    body += `\n<circle class="sweep" style="stroke-dasharray:${len.toFixed(2)} ${(CIRC - len + 0.01).toFixed(2)};animation-delay:${delay}s" cx="${CX}" cy="${CY}" r="${R_MID}" fill="none" stroke="${s.color}" stroke-width="${STROKE_W}" transform="rotate(${startDeg.toFixed(3)} ${CX} ${CY})"/>`;
    startDeg += sweepDeg;
  });

  body += `\n</g></g>`;

  const rows = slices
    .map((s, i) => {
      const y = 66 + i * 22;
      const label = `${s.name} ${s.pct.toFixed(1)}%`;
      return `\n<g class="fade" style="animation-delay:${(0.5 + i * 0.06).toFixed(2)}s"><rect x="24" y="${y - 12}" width="13" height="13" rx="2" fill="${s.color}" stroke="${theme.bg}"/>
<text x="44" y="${y}" font-size="13" fill="${theme.text}">${esc(label)}</text></g>`;
    })
    .join("");
  body += rows;

  const sub = `stars: ${stats.totals.stars} · followers: ${stats.totals.followers}`;
  body += `\n<text class="fade" style="animation-delay:${(0.5 + slices.length * 0.06).toFixed(2)}s" x="24" y="${HEIGHT - 16}" font-size="11" fill="${theme.muted}">${esc(sub)}</text>`;

  return card(theme, body);
}
