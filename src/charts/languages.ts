import type { Stats } from "../api";
import { LOGOS } from "../logos";
import { CASCADIA_600 } from "../font";

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

const WIDTH = 830;
const HEIGHT = 180;
const BAR_X = 24;
const BAR_W = WIDTH - 48;
const BAR_Y = 56;
const BAR_H = 24;
const BLOCK_Y = 100;

const NAME_TO_SLUG: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  java: "openjdk",
  "c#": "csharp",
  c: "c",
  "c++": "cplusplus",
  go: "go",
  rust: "rust",
  php: "php",
  svelte: "svelte",
  vue: "vuedotjs",
  html: "html5",
  css: "css3",
  shell: "gnubash",
  dockerfile: "docker",
  ruby: "ruby",
  kotlin: "kotlin",
  swift: "swift",
  zig: "zig",
  dart: "dart",
  lua: "lua",
  elixir: "elixir",
  haskell: "haskell",
  scala: "scala",
  gdscript: "godotengine",
};

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// lucide-style 24x24 stroke icons (ISC license, lucide.dev)
const ICONS: Record<string, string> = {
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  fork: '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/>',
  person: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};

function icon(name: string, x: number, y: number, size: number, color: string): string {
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(size / 24).toFixed(4)})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;
}

function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160;
}

interface Segment {
  name: string;
  color: string;
  pct: number;
}

const STYLE = `<style>
  .fill { transform: scaleX(0); transform-origin: left; transform-box: fill-box; animation: fill 1.4s cubic-bezier(.25,.6,.3,1) .2s forwards; }
  .pop { transform-box: fill-box; transform-origin: center; animation: pop .45s cubic-bezier(.34,1.56,.64,1) both; }
  .fade { animation: fadein .4s ease-out both; }
  .pulse { animation: pulse 2.4s ease-in-out 2s infinite; }
  @keyframes fill { to { transform: scaleX(1); } }
  @keyframes pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes fadein { from { opacity: 0; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) {
    .fill { transform: scaleX(1); animation: none; }
    .pop, .fade { animation-duration: .01s; animation-delay: 0s !important; }
    .pulse { animation: none; }
  }
</style>`;

function card(theme: Theme, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<style>
@font-face { font-family: 'Cascadia Code'; src: url(${CASCADIA_600}) format('woff2'); }
text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }
.title { font-family: 'Cascadia Code', 'Cascadia Mono', ui-monospace, Menlo, Consolas, monospace; }
</style>
${STYLE}
<rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="6" fill="${theme.bg}" stroke="${theme.border}"/>
${body}
</svg>`;
}

function logoBlock(seg: Segment, x: number, size: number, delay: number): string {
  const slug = NAME_TO_SLUG[seg.name.toLowerCase()];
  const path = slug ? LOGOS[slug] : undefined;
  const glyphColor = isLight(seg.color) ? "#1f2328" : "#ffffff";

  let glyph: string;
  if (path) {
    const k = (size * 0.58) / 24;
    const inset = (size - 24 * k) / 2;
    glyph = `<path d="${path}" fill="${glyphColor}" transform="translate(${(x + inset).toFixed(2)} ${(BLOCK_Y + inset).toFixed(2)}) scale(${k.toFixed(4)})"/>`;
  } else {
    glyph = `<text x="${x + size / 2}" y="${BLOCK_Y + size / 2 + size * 0.18}" font-size="${(size * 0.44).toFixed(1)}" font-weight="700" text-anchor="middle" fill="${glyphColor}">${esc(seg.name[0].toUpperCase())}</text>`;
  }

  return `<g class="pop" style="animation-delay:${delay.toFixed(2)}s">
<rect x="${x}" y="${BLOCK_Y}" width="${size}" height="${size}" rx="6" fill="${seg.color}"/>
${glyph}
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
<text class="fade title" x="24" y="42" font-size="20" fill="${theme.text}">&gt;top-languages</text>`;

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
  const POP_START = 1.5;
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
  const rightEdge = WIDTH - 44; // clears the pulse dot
  let ix = rightEdge - totalsW;
  const iconY = 42 - ICON_SIZE + 3;
  const totalsDelay = (POP_START + n * 0.12 + 0.3).toFixed(2);
  body += `\n<g class="fade" style="animation-delay:${totalsDelay}s">`;
  pairs.forEach((p) => {
    body += `\n${icon(p.icon, ix, iconY, ICON_SIZE, theme.muted)}`;
    body += `\n<text x="${(ix + ICON_SIZE + ICON_TEXT_GAP).toFixed(1)}" y="42" font-size="13" fill="${theme.text}">${p.value}</text>`;
    ix += ICON_SIZE + ICON_TEXT_GAP + textW(p.value) + PAIR_GAP;
  });
  body += `\n</g>`;

  return card(theme, body);
}
