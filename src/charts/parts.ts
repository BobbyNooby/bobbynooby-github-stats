import { LOGOS } from "../logos";
import { AUTO_LOGOS, AUTO_LANG_SLUGS } from "../auto-logos";

export interface Theme {
  bg: string;
  border: string;
  text: string;
  muted: string;
  other: string;
}

export const THEMES: Record<"light" | "dark", Theme> = {
  light: { bg: "#ffffff", border: "#d0d7de", text: "#24292f", muted: "#57606a", other: "#8b949e" },
  dark: { bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#8b949e", other: "#6e7681" },
};

export function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160;
}

// lucide-style 24x24 stroke icons (ISC license, lucide.dev)
const ICONS: Record<string, string> = {
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  fork: '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/>',
  person: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};

export function icon(name: string, x: number, y: number, size: number, color: string): string {
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(size / 24).toFixed(4)})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;
}

const NAME_TO_SLUG: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  java: "java",
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
  docker: "docker",
  markdown: "markdown",
  scss: "sass",
};

// hand-curated maps win over generated linguist×simple-icons matches
const ALL_LOGOS: Record<string, string> = { ...AUTO_LOGOS, ...LOGOS };
const ALL_SLUGS: Record<string, string> = { ...AUTO_LANG_SLUGS, ...NAME_TO_SLUG };

export function hasLogo(name: string): boolean {
  const slug = ALL_SLUGS[name.toLowerCase()] ?? ALL_SLUGS[name];
  return slug !== undefined && ALL_LOGOS[slug] !== undefined;
}

// non-square icons (e.g. Font Awesome java, 384x512); everything else is 24x24
export const LOGO_VIEWBOX: Record<string, [number, number]> = {
  java: [384, 512],
};

export function logoGlyph(name: string, color: string, x: number, y: number, size: number): string {
  const slug = ALL_SLUGS[name.toLowerCase()] ?? ALL_SLUGS[name];
  const path = slug ? ALL_LOGOS[slug] : undefined;
  const glyphColor = isLight(color) ? "#1f2328" : "#ffffff";

  if (path) {
    const [vw, vh] = (slug && LOGO_VIEWBOX[slug]) || [24, 24];
    const k = (size * 0.58) / Math.max(vw, vh);
    const insetX = (size - vw * k) / 2;
    const insetY = (size - vh * k) / 2;
    return `<path d="${path}" fill="${glyphColor}" transform="translate(${(x + insetX).toFixed(2)} ${(y + insetY).toFixed(2)}) scale(${k.toFixed(4)})"/>`;
  }
  return `<text x="${x + size / 2}" y="${y + size / 2 + size * 0.18}" font-size="${(size * 0.44).toFixed(1)}" font-weight="700" text-anchor="middle" fill="${glyphColor}">${esc(name[0].toUpperCase())}</text>`;
}
