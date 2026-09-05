import { describe, expect, test } from "bun:test";
import { loadConfig, MIN_HISTORY_DAYS, parseBool, parseEnum, parseNum } from "./env";

const base = { GITHUB_USERNAME: "bobbynooby" };

describe("loadConfig", () => {
  test("throws without GITHUB_USERNAME", () => {
    expect(() => loadConfig({})).toThrow("GITHUB_USERNAME is required");
  });

  test("defaults for every optional var", () => {
    const c = loadConfig(base);
    expect(c.username).toBe("bobbynooby");
    expect(c.token).toBeUndefined();
    expect(c.includePrivate).toBe(false);
    expect(c.handle).toBe("bobbynooby");
    expect(c.theme).toBe("auto");
    expect(c.showBar).toBe(true);
    expect(c.showGraphs).toBe("auto");
    expect(c.showAllLanguages).toBe(true);
    expect(c.logo).toBe("auto");
    expect(c.logoSize).toBe(27);
    expect(c.logoY).toBe(23);
    expect(c.logoInset).toBe(40);
    expect(c.animPreset).toBe("together");
    expect(c.animSpeed).toBe(1);
    expect(c.animOverrides).toEqual({});
    expect(c.port).toBe(3000);
    expect(c.dbPath).toBe("/data/stats.db");
    expect(c.intervalHours).toBe(24);
    expect(c.corsOrigin).toBe("*");
    expect(c.apiSecret).toBeUndefined();
    expect(c.refreshSecret).toBeUndefined();
    expect(c.githubApiBase).toBe("https://api.github.com");
    expect(c.githubApiUrl).toBe("https://api.github.com/graphql");
    expect(c.demo).toBe(false);
  });

  test("handle defaults to username but can be overridden", () => {
    expect(loadConfig(base).handle).toBe("bobbynooby");
    expect(loadConfig({ ...base, HANDLE: "bob" }).handle).toBe("bob");
  });

  test("booleans accept true/false/1/0/yes/no", () => {
    expect(loadConfig({ ...base, SHOW_BAR: "no" }).showBar).toBe(false);
    expect(loadConfig({ ...base, DEMO: "1" }).demo).toBe(true);
    expect(loadConfig({ ...base, INCLUDE_PRIVATE: "yes" }).includePrivate).toBe(true);
    expect(() => loadConfig({ ...base, SHOW_BAR: "maybe" })).toThrow("Invalid boolean");
  });

  test("SHOW_GRAPHS maps auto/true/false", () => {
    expect(loadConfig(base).showGraphs).toBe("auto");
    expect(loadConfig({ ...base, SHOW_GRAPHS: "true" }).showGraphs).toBe(true);
    expect(loadConfig({ ...base, SHOW_GRAPHS: "false" }).showGraphs).toBe(false);
    expect(loadConfig({ ...base, SHOW_GRAPHS: "AUTO" }).showGraphs).toBe("auto");
  });

  test("enum validation lists allowed values", () => {
    expect(loadConfig({ ...base, DEFAULT_THEME: "Dark" }).theme).toBe("dark");
    expect(() => loadConfig({ ...base, DEFAULT_THEME: "midnight" })).toThrow("auto | light | dark");
    expect(() => loadConfig({ ...base, LOGO: "spinny" })).toThrow("auto | dot | none");
  });

  test("numbers validate", () => {
    expect(loadConfig({ ...base, ANIMATION_SPEED: "0.5" }).animSpeed).toBe(0.5);
    expect(() => loadConfig({ ...base, ANIMATION_SPEED: "abc" })).toThrow("Invalid number");
  });

  test("animation overrides parse per section and field", () => {
    const c = loadConfig({
      ...base,
      ANIMATION_BAR_DELAY: "0.2",
      ANIMATION_GRAPHS_GAP: "0.5",
      ANIMATION_ALLLANGUAGES_STAGGER: "0.1",
      animation_logo_dur: "0.3", // case-insensitive keys
    });
    expect(c.animOverrides.bar).toEqual({ delay: 0.2 });
    expect(c.animOverrides.graphs).toEqual({ gap: 0.5 });
    expect(c.animOverrides.allLanguages).toEqual({ stagger: 0.1 });
    expect(c.animOverrides.logo).toEqual({ dur: 0.3 });
  });

  test("DEMO=true works with zero config", () => {
    const c = loadConfig({ DEMO: "true" });
    expect(c.demo).toBe(true);
    expect(c.username).toBe("demo");
    expect(c.handle).toBe("demo");
  });

  test("MIN_HISTORY_DAYS is 14", () => {
    expect(MIN_HISTORY_DAYS).toBe(14);
  });
});

describe("helpers", () => {
  test("parseBool", () => {
    expect(parseBool(undefined, true)).toBe(true);
    expect(parseBool("", false)).toBe(false);
    expect(parseBool("NO", false)).toBe(false);
    expect(() => parseBool("uh", true)).toThrow();
  });
  test("parseNum", () => {
    expect(parseNum(undefined, 3)).toBe(3);
    expect(parseNum("2.5", 3)).toBe(2.5);
    expect(() => parseNum("x", 3)).toThrow();
  });
  test("parseEnum", () => {
    expect(parseEnum(undefined, ["a", "b"] as const, "a")).toBe("a");
    expect(parseEnum("B", ["a", "b"] as const, "a")).toBe("b");
    expect(() => parseEnum("c", ["a", "b"] as const, "a")).toThrow();
  });
});
