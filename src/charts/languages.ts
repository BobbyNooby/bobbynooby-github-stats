import type { Stats } from "../api";
import { CASCADIA_600, QUICKSAND_300 } from "../font";
import { THEMES, esc, icon, logoGlyph, type Theme } from "./parts";

const WIDTH = 830;
const HEIGHT = 180;
const BAR_X = 24;
const BAR_W = WIDTH - 48;
const BAR_Y = 56;
const BAR_H = 24;
const BLOCK_Y = 100;

interface Segment {
  name: string;
  color: string;
  pct: number;
}

const STYLE = `<style>
  .fill { transform: scaleX(0); transform-origin: left; transform-box: fill-box; animation: fill 1.2s cubic-bezier(.25,.6,.3,1) .5s forwards; }
  .pop { transform-box: fill-box; transform-origin: center; animation: pop .45s cubic-bezier(.34,1.56,.64,1) both; }
  .fade { animation: fadein .4s ease-out both; }
  .rise { opacity: 0; animation: rise .5s cubic-bezier(.22,1,.36,1) both; }
  .pulse { animation: pulse 2.4s ease-in-out 1.8s infinite; }
  @keyframes fill { to { transform: scaleX(1); } }
  @keyframes pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes fadein { from { opacity: 0; } }
  @keyframes rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) {
    .fill { transform: scaleX(1); animation: none; }
    .pop, .fade, .rise { animation-duration: .01s; animation-delay: 0s !important; }
    .pulse { animation: none; }
  }
</style>`;

function card(theme: Theme = THEMES.light, body: string): string {
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

function logoBlock(seg: Segment, x: number, size: number, delay: number): string {
  return `<g class="pop" style="animation-delay:${delay.toFixed(2)}s">
<rect x="${x}" y="${BLOCK_Y}" width="${size}" height="${size}" rx="6" fill="${seg.color}"/>
${logoGlyph(seg.name, seg.color, x, BLOCK_Y, size)}
</g>`;
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
  const segments: Segment[] = top.map((l) => ({ name: l.name, color: l.color, pct: l.pct }));
  if (rest.length > 0) {
    segments.push({
      name: "Other",
      color: theme.other,
      pct: rest.reduce((sum, l) => sum + l.pct, 0),
    });
  }

  const clipId = `bar-${opts.theme}`;
  let body = `<circle class="pulse" cx="${WIDTH - 26}" cy="35" r="5" fill="#3fb950"/>
<text class="fade title" x="24" y="42" font-size="21" fill="${theme.text}"><tspan class="gt">&gt;</tspan><tspan>&#160;bobbynooby</tspan></text>`;

  // stacked bar: track + segments revealed left-to-right
  body += `<rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5" fill="${theme.muted}" opacity="0.15"/>`;
  body += `<clipPath id="${clipId}"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5"/></clipPath>`;
  body += `<g clip-path="url(#${clipId})"><g class="fill">`;
  let cum = BAR_X;
  segments.forEach((s) => {
    const w = Math.max((s.pct / 100) * BAR_W, 0.6);
    body += `\n<rect x="${cum.toFixed(2)}" y="${BAR_Y}" width="${w.toFixed(2)}" height="${BAR_H}" fill="${s.color}"/>`;
    cum += w;
  });
  body += `\n</g></g>`;

  // logo blocks, popping in after the bar fills
  const n = segments.length;
  const gap = 8;
  const size = Math.min(40, Math.floor((BAR_W - (n - 1) * gap) / n));
  const rowW = n * size + (n - 1) * gap;
  let x = BAR_X + (BAR_W - rowW) / 2;
  const POP_START = 1.8;
  segments.forEach((s, i) => {
    const delay = POP_START + i * 0.12;
    body += `\n${logoBlock(s, x, size, delay)}`;
    body += `\n<text class="fade" style="animation-delay:${(delay + 0.25).toFixed(2)}s" x="${(x + size / 2).toFixed(1)}" y="${BLOCK_Y + size + 15}" font-size="10" text-anchor="middle" fill="${theme.muted}">${s.pct >= 1 ? `${Math.round(s.pct)}%` : ""}</text>`;
    x += size + gap;
  });

  // totals with icons, right-aligned on the title row
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
  pairs.forEach((p, i) => {
    const delay = (0.15 + i * 0.12).toFixed(2);
    body += `\n<g class="rise" style="animation-delay:${delay}s">`;
    body += `\n${icon(p.icon, ix, iconY, ICON_SIZE, theme.muted)}`;
    body += `\n<text x="${(ix + ICON_SIZE + ICON_TEXT_GAP).toFixed(1)}" y="42" font-size="13" fill="${theme.text}">${p.value}</text>`;
    body += `\n</g>`;
    ix += ICON_SIZE + ICON_TEXT_GAP + textW(p.value) + PAIR_GAP;
  });

  return card(theme, body);
}
