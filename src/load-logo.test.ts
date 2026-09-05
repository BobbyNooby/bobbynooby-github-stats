import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { loadLogo, resetLogoCache } from "./load-logo";

const DIR = "/tmp/logo-test";

afterAll(() => rmSync(DIR, { recursive: true, force: true }));

function withFile(name: string, content: string): string {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/${name}`, content);
  return `${DIR}/${name}`;
}

describe("loadLogo", () => {
  test("missing file falls back to null (built-in mark)", () => {
    resetLogoCache();
    expect(loadLogo("/tmp/definitely-not-here.svg")).toBeNull();
  });

  test("extracts body and viewBox", () => {
    resetLogoCache();
    const p = withFile(
      "ok.svg",
      `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><circle cx="10" cy="10" r="5" fill="#f00"/></svg>`,
    );
    expect(loadLogo(p)).toEqual({
      body: `<circle cx="10" cy="10" r="5" fill="#f00"/>`,
      viewBox: [100, 50],
    });
  });

  test("synthesizes viewBox from width/height", () => {
    resetLogoCache();
    const p = withFile(
      "wh.svg",
      `<svg width="64" height="32"><rect width="10" height="10"/></svg>`,
    );
    expect(loadLogo(p)).toEqual({ body: `<rect width="10" height="10"/>`, viewBox: [64, 32] });
  });

  test("strips scripts, event handlers, external refs and foreignObject", () => {
    resetLogoCache();
    const p = withFile(
      "evil.svg",
      `<svg viewBox="0 0 10 10">
  <script>alert("x")</script>
  <circle onload="hack()" r="3" href="https://evil.example/x.png" xlink:href="https://evil.example/y.png"/>
  <foreignObject><body>hi</body></foreignObject>
  <path d="M0 0" fill="#fff"/>
</svg>`,
    );
    const logo = loadLogo(p);
    expect(logo).not.toBeNull();
    const body = logo!.body;
    expect(body).not.toContain("<script");
    expect(body).not.toContain("onload");
    expect(body).not.toContain("evil.example");
    expect(body).not.toContain("foreignObject");
    expect(body).toContain(`<path d="M0 0" fill="#fff"/>`);
  });

  test("rejects unusable files", () => {
    resetLogoCache();
    expect(loadLogo(withFile("nosvg.svg", "just text"))).toBeNull();
    expect(loadLogo(withFile("noviewbox.svg", "<svg><circle r='1'/></svg>"))).toBeNull();
  });
});
