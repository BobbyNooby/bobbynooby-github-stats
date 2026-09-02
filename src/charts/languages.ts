import type { DayHistory, Stats } from "../api";
import { CASCADIA_600, QUICKSAND_300 } from "../font";
import { SITE_LOGO } from "../logo";
import { THEMES, esc, hasLogo, icon, logoGlyph, type Theme } from "./parts";
import { CONFIG, resolveAnimation } from "../config";

const T = resolveAnimation();

// layout: 1 header · 2 bar · 3 selected tiles+pct · 4 two graphs · 5 all-language tiles
const WIDTH = 830;
const HEIGHT = 468;
const BAR_X = 24;
const BAR_W = WIDTH - 48;
const BAR_Y = 58;
const BAR_H = 22;
const T1_Y = 94; // selected tiles
const G1_TOP = 174;
const G1_H = 86;
const G2_TOP = 304;
const G2_H = 86;
const T2_Y = 420; // all-language tiles

const NON_LANGS = new Set(["Config", "Other"]);

const anim = (name: string, dur: number, delay: number, ease = "ease-out"): string =>
  `animation: ${name} ${dur.toFixed(2)}s ${ease} ${delay.toFixed(2)}s both`;

const FALLBACK_COLORS = [
  "#3178c6",
  "#f1e05a",
  "#3572A5",
  "#b07219",
  "#ff3e00",
  "#00ADD8",
  "#7355dd",
  "#89e051",
];

const STYLE = `<style>
  .fill { transform: scaleX(0); transform-origin: left; transform-box: fill-box; animation: fill 1.2s cubic-bezier(.25,.6,.3,1) .5s forwards; }
  .pop { transform-box: fill-box; transform-origin: center; animation: pop .45s cubic-bezier(.34,1.56,.64,1) both; }
  .fade { animation: fadein .4s ease-out both; }
  .rise { opacity: 0; animation: rise .5s cubic-bezier(.22,1,.36,1) both; }
  .line { stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; animation: draw 1.1s ease-out both; }
  .spin { transform-box: fill-box; transform-origin: center; animation: rotate 3s steps(72) infinite; }
  .pulse { animation: pulse 2.4s ease-in-out 2s infinite; }
  @keyframes fill { to { transform: scaleX(1); } }
  @keyframes pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes fadein { from { opacity: 0; } }
  @keyframes rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes draw { to { stroke-dashoffset: 0; opacity: 1; } }
  @keyframes rotate {
    from { transform: rotate3d(0, 1, 0, 0deg); }
    to { transform: rotate3d(0, 1, 0, 360deg); }
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) {
    .fill { transform: scaleX(1); animation: none; }
    .pop, .fade, .rise { animation-duration: .01s; animation-delay: 0s !important; }
    .line { animation-duration: .01s; }
    .spin, .pulse { animation: none; }
  }
</style>`;

function card(theme: Theme, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<style>
@font-face { font-family: 'Cascadia Code'; src: url(${CASCADIA_600}) format('woff2'); }
@font-face { font-family: 'Quicksand'; src: url(${QUICKSAND_300}) format('woff2'); }
text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }
.title { font-family: 'Quicksand', 'Segoe UI', sans-serif; font-weight: 300; }
.title .gt { font-family: 'Cascadia Code', 'Cascadia Mono', ui-monospace, Menlo, Consolas, monospace; }
.label { letter-spacing: 1px; }
</style>
${STYLE}
<rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="6" fill="${theme.bg}" stroke="${theme.border}"/>
${body}
</svg>`;
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
  const rightEdge = WIDTH - 70; // extra gap before the spinning logo
  let ix = rightEdge - totalsW;
  const iconY = 42 - ICON_SIZE + 3;
  let out = "";
  pairs.forEach((p, i) => {
    const delay = T.totals.delay + i * T.totals.stagger;
    out += `\n<g class="rise" style="${anim("rise", T.totals.dur, delay, "cubic-bezier(.22,1,.36,1)")}">`;
    out += `\n${icon(p.icon, ix, iconY, ICON_SIZE, theme.muted)}`;
    out += `\n<text x="${(ix + ICON_SIZE + ICON_TEXT_GAP).toFixed(1)}" y="42" font-size="13" fill="${theme.text}">${p.value}</text>`;
    out += `\n</g>`;
    ix += ICON_SIZE + ICON_TEXT_GAP + textW(p.value) + PAIR_GAP;
  });
  return out;
}

interface Curve {
  lang: string;
  color: string;
  linePath: string;
  sharePath: string;
}

// Catmull-Rom -> cubic Bézier: smooth curves through every point
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 3) {
    return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
  }
  let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

interface DailySeries {
  curves: Curve[];
  langOrder: string[];
  yearTicks: { x: number; year: string }[];
  g1Ticks: { y: number; label: string }[];
}

function niceCeil(v: number): number {
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow) * pow;
}

// linguist colors for languages that don't appear in the byte-based stats
const EXTRA_COLORS: Record<string, string> = {
  Markdown: "#083fa1",
  SQL: "#e38c00",
  Makefile: "#427819",
};

function buildSeries(days: DayHistory[], count: number, colorByLang: Map<string, string>): DailySeries {
  // cumulative lines per language on each ACTIVE day
  const cum: Record<string, number> = {};
  const frames: Record<string, number>[] = [];
  const activeDays: string[] = [];
  for (const d of days) {
    for (const l of d.languages) {
      if (NON_LANGS.has(l.language)) continue;
      cum[l.language] = (cum[l.language] ?? 0) + l.added;
    }
    frames.push({ ...cum });
    activeDays.push(d.day);
  }

  const langOrder = Object.entries(frames.at(-1) ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
  const curveLangs = langOrder.slice(0, count);

  // expand to a full calendar: every day gets the latest cumulative snapshot
  const startMs = Date.parse(`${activeDays[0]}T00:00:00Z`);
  const endMs = Date.parse(`${activeDays.at(-1)}T00:00:00Z`);
  const F = Math.round((endMs - startMs) / 86_400_000) + 1;
  const frameAt = new Map(activeDays.map((d, i) => [d, i]));
  const dayDate = (j: number) =>
    new Date(startMs + j * 86_400_000).toISOString().slice(0, 10);

  const calendar: Record<string, number>[] = [];
  const totals: number[] = [];
  let cur: Record<string, number> = {};
  for (let j = 0; j < F; j++) {
    const idx = frameAt.get(dayDate(j));
    if (idx !== undefined) cur = frames[idx]!;
    calendar.push(cur);
    totals.push(Object.values(cur).reduce((s, v) => s + v, 0));
  }

  const xAt = (j: number) => BAR_X + (F > 1 ? (j / (F - 1)) * BAR_W : 0);

  // scale ticks
  const g1Max = niceCeil(
    Math.max(curveLangs[0] ? (frames.at(-1)![curveLangs[0]!] ?? 1) : 1, 1),
  );
  const g1Ticks: { y: number; label: string }[] = [0, 1, 2, 3, 4].map((i) => {
    const v = (g1Max / 4) * i;
    return {
      y: G1_TOP + G1_H - (v / g1Max) * G1_H,
      label: v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`,
    };
  });

  // ~daily resolution capped to 366 samples; Catmull-Rom smoothing handles the rest
  const step = Math.max(1, Math.ceil(F / 366));
  const indices: number[] = [];
  for (let j = 0; j < F; j += step) indices.push(j);
  if (indices.at(-1) !== F - 1) indices.push(F - 1);

  const curves: Curve[] = curveLangs.map((lang, li) => {
    const lineXY: { x: number; y: number }[] = [];
    const shareXY: { x: number; y: number }[] = [];
    for (const j of indices) {
      const v = calendar[j]![lang] ?? 0;
      const total = totals[j]!;
      lineXY.push({ x: xAt(j), y: G1_TOP + G1_H - (v / g1Max) * G1_H });
      shareXY.push({
        x: xAt(j),
        y: G2_TOP + G2_H - ((total > 0 ? (v / total) * 100 : 0) / 100) * G2_H,
      });
    }
    return {
      lang,
      color:
        colorByLang.get(lang) ??
        EXTRA_COLORS[lang] ??
        FALLBACK_COLORS[li % FALLBACK_COLORS.length]!,
      linePath: smoothPath(lineXY),
      sharePath: smoothPath(shareXY),
    };
  });

  // year ticks
  const yearTicks: { x: number; year: string }[] = [];
  let lastTickX = -999;
  for (let j = 0; j < F; j++) {
    const d = dayDate(j);
    if (d.endsWith("-01-01") || j === 0) {
      const x = xAt(j);
      if (x - lastTickX >= 40) {
        yearTicks.push({ x, year: d.slice(0, 4) });
        lastTickX = x;
      }
    }
  }

  return { curves, langOrder, yearTicks, g1Ticks };
}

function gridlines(
  theme: Theme,
  top: number,
  h: number,
  ticks: { y: number; label: string }[],
  startDelay: number,
): string {
  let out = "";
  ticks.forEach((t, i) => {
    const delay = (startDelay + i * 0.06).toFixed(2);
    if (t.y !== top + h) {
      out += `\n<line class="fade" style="animation-delay:${delay}s" x1="${BAR_X}" y1="${t.y.toFixed(1)}" x2="${BAR_X + BAR_W}" y2="${t.y.toFixed(1)}" stroke="${theme.muted}" stroke-opacity="0.12"/>`;
    }
    out += `\n<text class="fade" style="animation-delay:${delay}s" x="${BAR_X - 4}" y="${(t.y + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="${theme.muted}">${t.label}</text>`;
  });
  return out;
}

export function languagesChart(
  stats: Stats | null,
  history: { days: DayHistory[] } | null,
  opts: { theme: "light" | "dark"; count: number },
): string {
  const theme = THEMES[opts.theme];
  if (
    (!stats || stats.languages.length === 0) &&
    (!history || history.days.length === 0)
  ) {
    return card(
      theme,
      `<text class="fade" x="24" y="52" font-size="20" font-weight="600" fill="${theme.text}">GitHub Stats</text>
<text class="fade" style="animation-delay:.15s" x="24" y="92" font-size="14" fill="${theme.muted}">No data yet — collecting stats.</text>
<text class="fade" style="animation-delay:.3s" x="24" y="114" font-size="13" fill="${theme.muted}">Check back after the first snapshot.</text>`,
    );
  }

  const colorByLang = new Map(
    (stats?.languages ?? []).map((l) => [l.name, l.color]),
  );
  // vector site logo, theme-adaptive (fill follows the card theme)
  const logoK = CONFIG.logo.size / SITE_LOGO.w;
  // top-right badge: logo (4th in the header cascade) or green pulsing dot
  const badgeDelay = T.logo.delay;
  let badge = "";
  if (CONFIG.logo.enabled && CONFIG.logo.variant === "logo") {
    const logoK = CONFIG.logo.size / SITE_LOGO.w;
    badge = `<g class="rise" style="${anim("rise", T.logo.dur, T.logo.delay, "cubic-bezier(.22,1,.36,1)")}"><g class="spin" style="animation-delay:0s"><g transform="translate(${(WIDTH - CONFIG.logo.insetFromRight - CONFIG.logo.size / 2).toFixed(1)} ${CONFIG.logo.y}) scale(${logoK.toFixed(6)})"><g transform="${SITE_LOGO.transform}" fill="${theme.text}">${SITE_LOGO.body}</g></g></g></g>`;
  } else if (CONFIG.logo.enabled && CONFIG.logo.variant === "dot") {
    const r = Math.max(CONFIG.logo.size * 0.2, 4);
    // center the dot on the totals icon row (icons sit at y 30..45)
    const dotCy = 37.5;
    badge = `<g class="rise" style="${anim("rise", T.logo.dur, T.logo.delay, "cubic-bezier(.22,1,.36,1)")}"><circle class="pulse" cx="${WIDTH - CONFIG.logo.insetFromRight - r}" cy="${dotCy}" r="${r}" fill="#3fb950"/></g>`;
  }
  let body = `${badge}
<text class="fade title" x="24" y="42" font-size="21" fill="${theme.text}"><tspan class="gt">&gt;</tspan><tspan>&#160;${esc(CONFIG.handle)}</tspan></text>`;
  if (stats && stats.languages.length > 0) body += totalsRow(theme, stats);

  // section 2 — bar
  let segments: { name: string; color: string; pct: number }[] = [];
  if (CONFIG.showBar && stats && stats.languages.length > 0) {
    const top = stats.languages.slice(0, opts.count);
    const rest = stats.languages.slice(opts.count);
    segments = top.map((l) => ({ name: l.name, color: l.color, pct: l.pct }));
    if (rest.length > 0) {
      segments.push({
        name: "Other",
        color: theme.other,
        pct: rest.reduce((s, l) => s + l.pct, 0),
      });
    }
    const clipId = `bar-${opts.theme}`;
    body += `\n<rect class="fade" style="animation-delay:.4s" x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5" fill="${theme.muted}" opacity="0.15"/>`;
    body += `\n<clipPath id="${clipId}"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5"/></clipPath>`;
    body += `\n<g clip-path="url(#${clipId})"><g class="fill" style="${anim("fill", T.bar.dur, T.bar.delay, "cubic-bezier(.25,.6,.3,1)")}">`;
    let cum = BAR_X;
    segments.forEach((s) => {
      const w = Math.max((s.pct / 100) * BAR_W, 0.6);
      body += `\n<rect x="${cum.toFixed(2)}" y="${BAR_Y}" width="${w.toFixed(2)}" height="${BAR_H}" fill="${s.color}"/>`;
      cum += w;
    });
    body += `\n</g></g>`;
  }

  // section 3 — selected tiles + pct
  if (segments.length > 0) {
    const n = segments.length;
    const gap = 8;
    const size = Math.min(34, Math.floor((BAR_W - (n - 1) * gap) / n));
    const rowW = n * size + (n - 1) * gap;
    let x = BAR_X + (BAR_W - rowW) / 2;
    segments.forEach((s, i) => {
      const delay = T.tiles.delay + i * T.tiles.stagger;
      const pctLabel = s.pct >= 1 ? `${Math.round(s.pct)}%` : "—";

      // the catch-all bucket has no logo — a muted glyph tile instead
      if (s.name === "Other") {
        body += `\n<g class="pop" style="${anim("pop", T.tiles.dur, delay, "cubic-bezier(.34,1.56,.64,1)")}">
<rect x="${x.toFixed(1)}" y="${T1_Y}" width="${size}" height="${size}" rx="6" fill="${s.color}"/>
<text x="${(x + size / 2).toFixed(1)}" y="${T1_Y + size / 2 + size * 0.14}" font-size="${(size * 0.4).toFixed(1)}" font-weight="700" text-anchor="middle" fill="#ffffff">···</text>
</g>
<text class="fade" style="animation: fadein .4s ease-out ${(Number(delay) + 0.25).toFixed(2)}s both" x="${(x + size / 2).toFixed(1)}" y="${T1_Y + size + 13}" font-size="10" text-anchor="middle" fill="${theme.muted}">${pctLabel}</text>`;
        x += size + gap;
        return;
      }

      body += `\n<g class="pop" style="${anim("pop", T.tiles.dur, delay, "cubic-bezier(.34,1.56,.64,1)")}">
<rect x="${x.toFixed(1)}" y="${T1_Y}" width="${size}" height="${size}" rx="6" fill="${s.color}"/>
${logoGlyph(s.name, s.color, x, T1_Y, size)}
</g>
<text class="fade" style="animation: fadein .4s ease-out ${(Number(delay) + 0.25).toFixed(2)}s both" x="${(x + size / 2).toFixed(1)}" y="${T1_Y + size + 13}" font-size="10" text-anchor="middle" fill="${theme.muted}">${pctLabel}</text>`;
      x += size + gap;
    });
  }

  // section 4 — two daily line graphs
  const LINE_START = T.graphs.delay;
  if (history && history.days.length > 0) {
    const { curves, yearTicks, g1Ticks } = buildSeries(history.days, 6, colorByLang);
    const graphs = [
      { label: "LINES OF CODE OVER TIME", top: G1_TOP, h: G1_H },
      { label: "SHARE OF MY CODE OVER TIME (%)", top: G2_TOP, h: G2_H },
    ];
    graphs.forEach((g, gi) => {
      body += `\n<text class="fade label" style="animation-delay:${LINE_START.toFixed(2)}s" x="24" y="${g.top - 8}" font-size="10" font-weight="600" fill="${theme.muted}">${g.label}</text>`;
      if (gi === 0) {
        body += gridlines(theme, g.top, g.h, g1Ticks, T.graphs.delay - 0.4);
      } else {
        body += gridlines(
          theme,
          g.top,
          g.h,
          [0, 25, 50, 75, 100].map((p) => ({
            y: g.top + g.h - (p / 100) * g.h,
            label: `${p}%`,
          })),
          2.1,
        );
      }
      body += `\n<line class="fade" style="animation-delay:${(LINE_START + 0.1).toFixed(2)}s" x1="${BAR_X}" y1="${g.top + g.h}" x2="${BAR_X + BAR_W}" y2="${g.top + g.h}" stroke="${theme.muted}" stroke-opacity="0.3"/>`;
      curves.forEach((c, li) => {
        const d = gi === 0 ? c.linePath : c.sharePath;
        const delay = LINE_START + 0.2 + gi * (T.graphs.gap ?? 0.5) + li * T.graphs.stagger;
        body += `\n<path class="line" style="${anim("draw", T.graphs.dur, delay)}" d="${d}" fill="none" stroke="${c.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>`;
      });
      if (gi === 1) {
        for (const t of yearTicks) {
          body += `\n<text class="fade" style="animation-delay:${(LINE_START + 1.4).toFixed(2)}s" x="${t.x.toFixed(1)}" y="${g.top + g.h + 15}" font-size="10" text-anchor="middle" fill="${theme.muted}">${t.year}</text>`;
        }
      }
    });
  }

  // section 5 — every language
  let tiles: { name: string; color: string }[] = [];
  if (CONFIG.showAllLanguages && history && history.days.length > 0) {
    const cum: Record<string, number> = {};
    for (const d of history.days) {
      for (const l of d.languages) {
        if (NON_LANGS.has(l.language)) continue;
        cum[l.language] = (cum[l.language] ?? 0) + l.added;
      }
    }
    tiles = Object.entries(cum)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => ({
        name,
        color: colorByLang.get(name) ?? EXTRA_COLORS[name] ?? FALLBACK_COLORS[0]!,
      }))
      .filter((t) => hasLogo(t.name));
  } else if (stats && stats.languages.length > 0) {
    tiles = stats.languages.map((l) => ({ name: l.name, color: l.color }));
  }
  if (tiles.length > 0) {
    const n = tiles.length;
    const gap = 6;
    const size = Math.min(36, Math.floor((BAR_W - (n - 1) * gap) / n));
    const rowW = n * size + (n - 1) * gap;
    let x = BAR_X + (BAR_W - rowW) / 2;
    const TILE_START = T.allLanguages.delay;
    tiles.forEach((t, i) => {
      const delay = TILE_START + i * T.allLanguages.stagger;
      body += `\n<g class="pop" style="${anim("pop", T.allLanguages.dur, delay, "cubic-bezier(.34,1.56,.64,1)")}">
<rect x="${x.toFixed(1)}" y="${T2_Y}" width="${size}" height="${size}" rx="6" fill="${t.color}"/>
${logoGlyph(t.name, t.color, x, T2_Y, size)}
</g>`;
      x += size + gap;
    });
  }

  return card(theme, body);
}
