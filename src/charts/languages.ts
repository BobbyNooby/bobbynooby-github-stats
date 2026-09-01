import type { MonthHistory, Stats } from "../api";
import { CASCADIA_600, QUICKSAND_300 } from "../font";
import { THEMES, esc, icon, logoGlyph, type Theme } from "./parts";

const WIDTH = 830;
const HEIGHT = 230;
const BAR_X = 24;
const BAR_W = WIDTH - 48;
const BAR_Y = 54;
const BAR_H = 22;
const PLOT_TOP = 92;
const PLOT_H = 52;
const PLOT_BOTTOM = PLOT_TOP + PLOT_H;
const TILE_Y = 168;

const NON_LANGS = new Set(["Config", "Other"]);
const FALLBACK_COLORS = ["#3178c6", "#f1e05a", "#3572A5", "#b07219", "#ff3e00", "#00ADD8", "#7355dd", "#89e051"];

const STYLE = `<style>
  .fill { transform: scaleX(0); transform-origin: left; transform-box: fill-box; animation: fill 1.2s cubic-bezier(.25,.6,.3,1) .5s forwards; }
  .pop { transform-box: fill-box; transform-origin: center; animation: pop .45s cubic-bezier(.34,1.56,.64,1) both; }
  .fade { animation: fadein .4s ease-out both; }
  .rise { opacity: 0; animation: rise .5s cubic-bezier(.22,1,.36,1) both; }
  .line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.2s ease-out both; }
  .pulse { animation: pulse 2.4s ease-in-out 2.4s infinite; }
  @keyframes fill { to { transform: scaleX(1); } }
  @keyframes pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes fadein { from { opacity: 0; } }
  @keyframes rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) {
    .fill { transform: scaleX(1); animation: none; }
    .pop, .fade, .rise { animation-duration: .01s; animation-delay: 0s !important; }
    .line { animation-duration: .01s; }
    .pulse { animation: none; }
  }
</style>`;

function card(theme: Theme, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<style>
@font-face { font-family: 'Cascadia Code'; src: url(${CASCADIA_600}) format('woff2'); }
@font-face { font-family: 'Quicksand'; src: url(${QUICKSAND_300}) format('woff2'); }
text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }
.title { font-family: 'Quicksand', 'Segoe UI', sans-serif; font-weight: 300; }
.title .gt { font-family: 'Cascadia Code', 'Cascadia Mono', ui-monospace, Menlo, Consolas, monospace; }
</style>
${STYLE}
<rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="6" fill="${theme.bg}" stroke="${theme.border}"/>
${body}
</svg>`;
}

function noData(theme: Theme): string {
  return card(
    theme,
    `<text class="fade" x="24" y="52" font-size="20" font-weight="600" fill="${theme.text}">GitHub Stats</text>
<text class="fade" style="animation-delay:.15s" x="24" y="92" font-size="14" fill="${theme.muted}">No data yet — collecting stats.</text>
<text class="fade" style="animation-delay:.3s" x="24" y="114" font-size="13" fill="${theme.muted}">Check back after the first snapshot.</text>`
  );
}

function totalsRow(theme: Theme, stats: Stats): string {
  const pairs = [
    { icon: "star", value: stats.totals.stars },
    { icon: "fork", value: stats.totals.forks },
    { icon: "person", value: stats.totals.followers },
  ];
  const ICON_SIZE = 15;
  const ICON_TEXT_GAP = 5;
  const PAIR_GAP = 20;
  const textW = (v: number) => String(v).length * 7;
  const totalsW =
    pairs.reduce((w, p) => w + ICON_SIZE + ICON_TEXT_GAP + textW(p.value), 0) +
    (pairs.length - 1) * PAIR_GAP;
  const rightEdge = WIDTH - 44;
  let ix = rightEdge - totalsW;
  const iconY = 42 - ICON_SIZE + 3;
  let out = "";
  pairs.forEach((p, i) => {
    const delay = (0.15 + i * 0.12).toFixed(2);
    out += `\n<g class="rise" style="animation-delay:${delay}s">`;
    out += `\n${icon(p.icon, ix, iconY, ICON_SIZE, theme.muted)}`;
    out += `\n<text x="${(ix + ICON_SIZE + ICON_TEXT_GAP).toFixed(1)}" y="42" font-size="13" fill="${theme.text}">${p.value}</text>`;
    out += `\n</g>`;
    ix += ICON_SIZE + ICON_TEXT_GAP + textW(p.value) + PAIR_GAP;
  });
  return out;
}

function historyLines(
  theme: Theme,
  months: MonthHistory[],
  colorByLang: Map<string, string>,
  lineStart: number
): { paths: string; axis: string; langOrder: string[] } {
  const F = months.length;
  const cum: Record<string, number> = {};
  const frames: Record<string, number>[] = [];
  for (const m of months) {
    for (const l of m.languages) {
      if (NON_LANGS.has(l.language)) continue;
      cum[l.language] = (cum[l.language] ?? 0) + l.added;
    }
    frames.push({ ...cum });
  }

  const langOrder = Object.entries(frames.at(-1) ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
  const curveLangs = langOrder.slice(0, 6);
  const maxVal = Math.max(...curveLangs.map((l) => frames.at(-1)![l] ?? 0), 1);

  const xAt = (i: number) => BAR_X + (F > 1 ? (i / (F - 1)) * BAR_W : 0);
  const yAt = (v: number) => PLOT_BOTTOM - (v / maxVal) * PLOT_H;

  let paths = "";
  curveLangs.forEach((lang, li) => {
    const pts = frames.map((frame, i) => `${xAt(i).toFixed(1)},${yAt(frame[lang] ?? 0).toFixed(1)}`).join(" ");
    const color = colorByLang.get(lang) ?? FALLBACK_COLORS[li % FALLBACK_COLORS.length]!;
    paths += `\n<polyline class="line" style="animation-delay:${(lineStart + li * 0.15).toFixed(2)}s" points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>`;
  });

  // year ticks on the axis
  let axis = `\n<line x1="${BAR_X}" y1="${PLOT_BOTTOM}" x2="${BAR_X + BAR_W}" y2="${PLOT_BOTTOM}" stroke="${theme.muted}" stroke-opacity="0.3"/>`;
  months.forEach((m, i) => {
    if (!m.month.endsWith("-01")) return;
    axis += `\n<text class="fade" style="animation-delay:${(lineStart + 1).toFixed(2)}s" x="${xAt(i).toFixed(1)}" y="${PLOT_BOTTOM + 14}" font-size="10" text-anchor="middle" fill="${theme.muted}">${m.month.slice(0, 4)}</text>`;
  });

  return { paths, axis, langOrder };
}

export function languagesChart(
  stats: Stats | null,
  history: { months: MonthHistory[] } | null,
  opts: { theme: "light" | "dark"; count: number }
): string {
  const theme = THEMES[opts.theme];
  if ((!stats || stats.languages.length === 0) && (!history || history.months.length === 0)) {
    return noData(theme);
  }

  const colorByLang = new Map((stats?.languages ?? []).map((l) => [l.name, l.color]));
  let body = `<circle class="pulse" cx="${WIDTH - 26}" cy="35" r="5" fill="#3fb950"/>
<text class="fade title" x="24" y="42" font-size="21" fill="${theme.text}"><tspan class="gt">&gt;</tspan><tspan>&#160;bobbynooby</tspan></text>`;

  if (stats && stats.languages.length > 0) {
    body += totalsRow(theme, stats);
  }

  // current-allocation bar, load-in fill
  if (stats && stats.languages.length > 0) {
    const top = stats.languages.slice(0, opts.count);
    const rest = stats.languages.slice(opts.count);
    const segments = top.map((l) => ({ name: l.name, color: l.color, pct: l.pct }));
    if (rest.length > 0) {
      segments.push({ name: "Other", color: theme.other, pct: rest.reduce((s, l) => s + l.pct, 0) });
    }
    const clipId = `bar-${opts.theme}`;
    body += `\n<rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5" fill="${theme.muted}" opacity="0.15"/>`;
    body += `\n<clipPath id="${clipId}"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5"/></clipPath>`;
    body += `\n<g clip-path="url(#${clipId})"><g class="fill">`;
    let cum = BAR_X;
    segments.forEach((s) => {
      const w = Math.max((s.pct / 100) * BAR_W, 0.6);
      body += `\n<rect x="${cum.toFixed(2)}" y="${BAR_Y}" width="${w.toFixed(2)}" height="${BAR_H}" fill="${s.color}"/>`;
      cum += w;
    });
    body += `\n</g></g>`;
  }

  // history line chart below the bar
  let langOrder: string[] = [];
  let tiles: { name: string; color: string }[] = [];
  const LINE_START = 1.9;
  if (history && history.months.length > 0) {
    body += `\n<text class="fade" style="animation-delay:${LINE_START.toFixed(2)}s" x="24" y="${PLOT_TOP - 8}" font-size="11" font-weight="600" fill="${theme.muted}">LINES OF CODE OVER TIME</text>`;
    const { paths, axis, langOrder: order } = historyLines(theme, history.months, colorByLang, LINE_START + 0.1);
    body += paths + axis;
    langOrder = order;
    tiles = langOrder.map((name) => ({ name, color: colorByLang.get(name) ?? FALLBACK_COLORS[0]! }));
  }

  // all languages as logo tiles below the graph
  if (tiles.length === 0 && stats && stats.languages.length > 0) {
    tiles = stats.languages.map((l) => ({ name: l.name, color: l.color }));
  }

  if (tiles.length > 0) {
    const n = tiles.length;
    const gap = 6;
    const size = Math.min(36, Math.floor((BAR_W - (n - 1) * gap) / n));
    const rowW = n * size + (n - 1) * gap;
    let x = BAR_X + (BAR_W - rowW) / 2;
    const TILE_START = LINE_START + 1.3;
    tiles.forEach((t, i) => {
      const delay = (TILE_START + i * 0.06).toFixed(2);
      body += `\n<g class="pop" style="animation-delay:${delay}s">
<rect x="${x.toFixed(1)}" y="${TILE_Y}" width="${size}" height="${size}" rx="6" fill="${t.color}"/>
${logoGlyph(t.name, t.color, x, TILE_Y, size)}
</g>`;
      x += size + gap;
    });
  }

  return card(theme, body);
}
