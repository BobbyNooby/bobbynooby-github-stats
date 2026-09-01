import type { MonthHistory, Stats } from "../api";
import { CASCADIA_600, QUICKSAND_300 } from "../font";
import { THEMES, esc, logoGlyph } from "./parts";

const WIDTH = 830;
const HEIGHT = 180;
const BAR_X = 24;
const BAR_W = WIDTH - 48;
const BAR_Y = 56;
const BAR_H = 24;
const BLOCK_Y = 112;
const BEGIN = 1.2;

interface Segment {
  name: string;
  color: string;
  widths: number[]; // per frame
  xs: number[]; // per frame
  firstFrame: number;
  finalPct: number;
}

const STYLE = `<style>
  .fade { animation: fadein .4s ease-out both; }
  .pop { transform-box: fill-box; transform-origin: center; animation: pop .45s cubic-bezier(.34,1.56,.64,1) both; }
  .pulse { animation: pulse 2.4s ease-in-out 2s infinite; }
  @keyframes fadein { from { opacity: 0; } }
  @keyframes pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) {
    .pop, .fade { animation-duration: .01s; animation-delay: 0s !important; }
    .pulse { animation: none; }
  }
</style>`;

function card(body: string, theme: "light" | "dark"): string {
  const t = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<style>
@font-face { font-family: 'Cascadia Code'; src: url(${CASCADIA_600}) format('woff2'); }
@font-face { font-family: 'Quicksand'; src: url(${QUICKSAND_300}) format('woff2'); }
text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }
.title { font-family: 'Quicksand', 'Segoe UI', sans-serif; font-weight: 300; }
.title .gt { font-family: 'Cascadia Code', 'Cascadia Mono', ui-monospace, Menlo, Consolas, monospace; }
</style>
${STYLE}
<rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="6" fill="${t.bg}" stroke="${t.border}"/>
${body}
</svg>`;
}

const FALLBACK_COLORS = ["#3178c6", "#f1e05a", "#3572A5", "#b07219", "#ff3e00", "#00ADD8", "#7355dd", "#89e051"];

function buildFrames(months: MonthHistory[], count: number): Segment[] {
  // cumulative lines added per language, snapshot per month
  const cum: Record<string, number> = {};
  const frames: Record<string, number>[] = [];
  for (const m of months) {
    for (const l of m.languages) {
      cum[l.language] = (cum[l.language] ?? 0) + l.added;
    }
    frames.push({ ...cum });
  }

  const finalTotals = frames.at(-1) ?? {};
  const ranked = Object.entries(finalTotals).sort((a, b) => b[1] - a[1]);
  const barLangs = ranked.slice(0, count).map(([l]) => l);
  const otherLangs = new Set(ranked.slice(count).map(([l]) => l));

  const series = new Map<string, number[]>();
  for (const lang of barLangs) series.set(lang, []);
  const hasOther = otherLangs.size > 0;
  if (hasOther) series.set("Other", []);

  for (const frame of frames) {
    const vals: Record<string, number> = {};
    let other = 0;
    for (const [lang, total] of Object.entries(frame)) {
      if (otherLangs.has(lang)) other += total;
      else if (series.has(lang)) vals[lang] = total;
    }
    for (const lang of barLangs) series.get(lang)!.push(vals[lang] ?? 0);
    if (hasOther) series.get("Other")!.push(other);
  }

  const grandFinal = [...series.values()].reduce((s, vals) => s + (vals.at(-1) ?? 0), 0);

  const segments: Segment[] = [...series.entries()].map(([lang, vals], i) => {
    const widths = frames.map((_, f) => {
      const frameTotal = [...series.values()].reduce((s, v) => s + (v[f] ?? 0), 0);
      return frameTotal > 0 ? ((vals[f] ?? 0) / frameTotal) * BAR_W : 0;
    });
    const xs: number[] = [];
    let acc = BAR_X;
    for (const w of widths) {
      xs.push(acc);
      acc += w;
    }
    const firstFrame = widths.findIndex((w) => w > 0.5);
    return {
      name: lang,
      color: FALLBACK_COLORS[i % FALLBACK_COLORS.length]!,
      widths,
      xs,
      firstFrame: firstFrame === -1 ? 0 : firstFrame,
      finalPct: grandFinal > 0 ? ((vals.at(-1) ?? 0) / grandFinal) * 100 : 0,
    };
  });

  return segments.sort((a, b) => b.finalPct - a.finalPct);
}

function keyTimesFor(F: number): string {
  if (F <= 1) return "0";
  const parts: string[] = [];
  for (let i = 0; i < F; i++) parts.push((i / (F - 1)).toFixed(4));
  return parts.join(";");
}

export function evolutionChart(
  history: { months: MonthHistory[] } | null,
  stats: Stats | null,
  opts: { theme: "light" | "dark"; count: number; dur: number }
): string {
  const theme = THEMES[opts.theme];
  if (!history || history.months.length === 0) {
    return card(
      `<text class="fade" x="24" y="52" font-size="20" font-weight="600" fill="${theme.text}">Evolution</text>
<text x="24" y="92" font-size="14" fill="${theme.muted}">No git history yet — run scripts/backfill-history.ts on the stats service.</text>`,
      opts.theme
    );
  }

  const colorByLang = new Map((stats?.languages ?? []).map((l) => [l.name, l.color]));
  const segments = buildFrames(history.months, opts.count).map((s) => ({
    ...s,
    color: colorByLang.get(s.name) ?? s.color,
  }));

  const F = history.months.length;
  const dur = opts.dur;
  const frameDur = dur / F;
  const keyTimes = keyTimesFor(F);

  let body = `<circle class="pulse" cx="${WIDTH - 26}" cy="35" r="5" fill="#3fb950"/>
<text class="fade title" x="24" y="42" font-size="21" fill="${theme.text}"><tspan class="gt">&gt;</tspan><tspan>&#160;history</tspan></text>`;

  const clipId = `evo-${opts.theme}`;
  body += `<rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5" fill="${theme.muted}" opacity="0.15"/>`;
  body += `<clipPath id="${clipId}"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5"/></clipPath>`;
  body += `<g clip-path="url(#${clipId})">`;

  for (const seg of segments) {
    const wVals = seg.widths.map((w) => Math.max(w, 0).toFixed(2)).join(";");
    const xVals = seg.xs.map((x) => x.toFixed(2)).join(";");
    const anims =
      F > 1
        ? `<animate attributeName="x" values="${xVals}" keyTimes="${keyTimes}" dur="${dur}s" begin="${BEGIN}s" fill="freeze"/><animate attributeName="width" values="${wVals}" keyTimes="${keyTimes}" dur="${dur}s" begin="${BEGIN}s" fill="freeze"/>`
        : "";
    body += `\n<rect x="${seg.xs[0]!.toFixed(2)}" y="${BAR_Y}" width="${Math.max(seg.widths[0]!, 0).toFixed(2)}" height="${BAR_H}" fill="${seg.color}">${anims}</rect>`;
  }
  body += `\n</g>`;

  // timeline scrubber: year boundaries + first/last, revealed as playback passes
  body += `\n<line x1="${BAR_X}" y1="${BAR_Y + BAR_H + 10}" x2="${BAR_X + BAR_W}" y2="${BAR_Y + BAR_H + 10}" stroke="${theme.muted}" stroke-opacity="0.3"/>`;
  const labelFrames = new Set<number>([0, F - 1]);
  history.months.forEach((m, i) => {
    if (m.month.endsWith("-01")) labelFrames.add(i);
  });
  let lastX = -999;
  history.months.forEach((m, i) => {
    if (!labelFrames.has(i)) return;
    const frac = F > 1 ? i / (F - 1) : 0;
    const x = BAR_X + frac * BAR_W;
    if (x - lastX < 56 && i !== F - 1) return;
    lastX = x;
    const anchor = i === 0 ? "start" : i === F - 1 ? "end" : "middle";
    const t = (BEGIN + i * frameDur).toFixed(2);
    const tEnd = (BEGIN + Math.min(i + 1, F) * frameDur).toFixed(2);
    const isLast = i === F - 1;
    const values = isLast ? "0;1" : "0;1;0";
    const keyT = isLast ? `0;${t}` : `0;${t};${tEnd}`;
    body += `\n<text x="${x.toFixed(1)}" y="${BAR_Y + BAR_H + 26}" font-size="11" text-anchor="${anchor}" fill="${theme.muted}" opacity="0"><animate attributeName="opacity" calcMode="discrete" values="${values}" keyTimes="${keyT}" dur="${dur}s" begin="${BEGIN}s" fill="freeze"/>${esc(m.month)}</text>`;
  });

  // logo tiles pop in when their language first appears
  const n = segments.length;
  const gap = 8;
  const size = Math.min(40, Math.floor((BAR_W - (n - 1) * gap) / n));
  const rowW = n * size + (n - 1) * gap;
  let x = BAR_X + (BAR_W - rowW) / 2;
  segments.forEach((seg) => {
    const delay = BEGIN + seg.firstFrame * frameDur;
    body += `\n<g class="pop" style="animation-delay:${delay.toFixed(2)}s">
<rect x="${x}" y="${BLOCK_Y}" width="${size}" height="${size}" rx="6" fill="${seg.color}"/>
${logoGlyph(seg.name, seg.color, x, BLOCK_Y, size)}
</g>`;

    if (seg.name === "Other") {
      x += size + gap;
      return;
    }

    // counting pct label: one discrete text per run of equal rounded values,
    // so the number ticks up/down in sync with the bar morphing
    const runs: { v: number; from: number; to: number }[] = [];
    let cur: { v: number; from: number } | null = null;
    for (let f = seg.firstFrame; f < F; f++) {
      const v = Math.round((seg.widths[f] / BAR_W) * 100);
      if (!cur || cur.v !== v) {
        if (cur) runs.push({ v: cur.v, from: cur.from, to: f });
        cur = { v, from: f };
      }
    }
    if (cur) runs.push({ v: cur.v, from: cur.from, to: F });

    for (const r of runs) {
      if (r.v < 1) continue;
      const t0 = (BEGIN + r.from * frameDur).toFixed(2);
      const t1 = (BEGIN + r.to * frameDur).toFixed(2);
      const isLast = r.to === F;
      const values = isLast ? "0;1" : "0;1;0";
      const keyT = isLast ? `0;${t0}` : `0;${t0};${t1}`;
      body += `\n<text x="${(x + size / 2).toFixed(1)}" y="${BLOCK_Y + size + 15}" font-size="10" text-anchor="middle" fill="${theme.muted}" opacity="0"><animate attributeName="opacity" calcMode="discrete" values="${values}" keyTimes="${keyT}" dur="${dur}s" begin="${BEGIN}s" fill="freeze"/>${r.v}%</text>`;
    }
    x += size + gap;
  });

  return card(body, opts.theme);
}
