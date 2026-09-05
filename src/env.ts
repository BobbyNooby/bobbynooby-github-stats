/**
 * Single source of truth for configuration. Everything the service does is
 * controlled by env vars documented in .env.example — forking requires no
 * code edits. Only GITHUB_USERNAME is required.
 */
export type SectionName =
  | "totals"
  | "bar"
  | "tiles"
  | "graphs"
  | "allLanguages"
  | "logo";

export interface SectionTiming {
  delay: number;
  dur: number;
  stagger: number;
  gap?: number; // graphs only: pause between the two plots
}

type Env = Record<string, string | undefined>;

function raw(env: Env, name: string): string | undefined {
  const v = env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v.trim() === "") return fallback;
  const s = v.toLowerCase();
  if (["true", "1", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  throw new Error(`Invalid boolean "${v}" (use true/false/1/0/yes/no)`);
}

export function parseNum(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number "${v}"`);
  return n;
}

export function parseEnum<T extends string>(
  v: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (v === undefined) return fallback;
  const s = v.toLowerCase() as T;
  if (!allowed.includes(s)) {
    throw new Error(`Invalid value "${v}" (allowed: ${allowed.join(" | ")})`);
  }
  return s;
}

// graphs stay hidden until this many distinct days of history exist,
// unless SHOW_GRAPHS=true forces them on or false keeps them off
export const MIN_HISTORY_DAYS = 14;

const SECTION_KEYS = {
  TOTALS: "totals",
  BAR: "bar",
  TILES: "tiles",
  GRAPHS: "graphs",
  ALLLANGUAGES: "allLanguages",
  LOGO: "logo",
} as const;

const TIMING_KEYS = ["DELAY", "DUR", "STAGGER", "GAP"] as const;

function parseAnimOverrides(env: Env): Partial<Record<SectionName, Partial<SectionTiming>>> {
  const overrides: Partial<Record<SectionName, Partial<SectionTiming>>> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.toUpperCase().startsWith("ANIMATION_") || !value) continue;
    const rest = key.slice("ANIMATION_".length).toUpperCase();
    const sectionKey = TIMING_KEYS.map((t) => rest.endsWith(`_${t}`) ? t : null).find(Boolean);
    if (!sectionKey) continue;
    const sectionRaw = rest.slice(0, rest.length - sectionKey.length - 1);
    const section = SECTION_KEYS[sectionRaw as keyof typeof SECTION_KEYS];
    if (!section) continue;
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`Invalid number "${value}" in ${key}`);
    overrides[section] ??= {};
    const timing = overrides[section]!;
    if (sectionKey === "DELAY") timing.delay = n;
    else if (sectionKey === "DUR") timing.dur = n;
    else if (sectionKey === "STAGGER") timing.stagger = n;
    else timing.gap = n;
  }
  return overrides;
}

export interface AppConfig {
  username: string;
  token: string | undefined;
  includePrivate: boolean;
  handle: string;
  theme: "auto" | "light" | "dark";
  showBar: boolean;
  showGraphs: "auto" | boolean;
  showAllLanguages: boolean;
  logo: "auto" | "dot" | "none";
  logoSize: number;
  logoY: number;
  logoInset: number;
  animPreset: "cascade" | "snappy" | "together";
  animSpeed: number;
  animOverrides: Partial<Record<SectionName, Partial<SectionTiming>>>;
  port: number;
  dbPath: string;
  intervalHours: number;
  corsOrigin: string;
  apiSecret: string | undefined;
  refreshSecret: string | undefined;
  githubApiBase: string;
  githubApiUrl: string;
  demo: boolean;
}

export function loadConfig(env: Env = process.env): AppConfig {
  const demo = parseBool(raw(env, "DEMO"), false);
  // DEMO mode renders stub data, so it works with zero configuration
  const username = raw(env, "GITHUB_USERNAME") ?? (demo ? "demo" : undefined);
  if (!username) throw new Error("GITHUB_USERNAME is required");
  return {
    username,
    token: raw(env, "GITHUB_TOKEN"),
    includePrivate: parseBool(raw(env, "INCLUDE_PRIVATE"), false),
    handle: raw(env, "HANDLE") ?? username,
    theme: parseEnum(raw(env, "DEFAULT_THEME"), ["auto", "light", "dark"] as const, "auto"),
    showBar: parseBool(raw(env, "SHOW_BAR"), true),
    showGraphs: parseEnum(
      raw(env, "SHOW_GRAPHS"),
      ["auto", "true", "false"] as const,
      "auto",
    ) === "auto" ? "auto" : parseBool(raw(env, "SHOW_GRAPHS"), true),
    showAllLanguages: parseBool(raw(env, "SHOW_ALL_LANGUAGES"), true),
    logo: parseEnum(raw(env, "LOGO"), ["auto", "dot", "none"] as const, "auto"),
    logoSize: parseNum(raw(env, "LOGO_SIZE"), 27),
    logoY: parseNum(raw(env, "LOGO_Y"), 23),
    logoInset: parseNum(raw(env, "LOGO_INSET"), 40),
    animPreset: parseEnum(
      raw(env, "ANIMATION_PRESET"),
      ["cascade", "snappy", "together"] as const,
      "together",
    ),
    animSpeed: parseNum(raw(env, "ANIMATION_SPEED"), 1),
    animOverrides: parseAnimOverrides(env),
    port: parseNum(raw(env, "PORT"), 3000),
    dbPath: raw(env, "DB_PATH") ?? "/data/stats.db",
    intervalHours: parseNum(raw(env, "INTERVAL_HOURS"), 24),
    corsOrigin: raw(env, "CORS_ORIGIN") ?? "*",
    apiSecret: raw(env, "API_SECRET"),
    refreshSecret: raw(env, "REFRESH_SECRET"),
    githubApiBase: (raw(env, "GITHUB_API_BASE") ?? "https://api.github.com").replace(/\/$/, ""),
    githubApiUrl: raw(env, "GITHUB_API_URL") ?? "https://api.github.com/graphql",
    demo,
  };
}
