/**
 * Drop-in logo support: put a self-contained SVG at assets/logo.svg and it
 * replaces the built-in mark. The file is read once and sanitized — scripts,
 * event handlers, external references and foreignObject are stripped, so a
 * malicious file can't inject anything into the served card.
 */
import { readFileSync } from "node:fs";

export interface LoadedLogo {
  body: string;
  viewBox: [number, number];
}

let cache: LoadedLogo | null | undefined;

export function loadLogo(path = "assets/logo.svg"): LoadedLogo | null {
  if (cache === undefined) cache = readLogo(path);
  return cache;
}

/** exposed for tests */
export function resetLogoCache(): void {
  cache = undefined;
}

function readLogo(path: string): LoadedLogo | null {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return null; // no drop-in provided — fall back to the built-in mark
  }

  const openTag = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!openTag) return null;

  let viewBox = parseViewBox(openTag);
  if (!viewBox) {
    const w = Number(attr(openTag, "width"));
    const h = Number(attr(openTag, "height"));
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) viewBox = [w, h];
  }
  if (!viewBox) return null;

  const start = text.indexOf(openTag) + openTag.length;
  const end = text.lastIndexOf("</svg>");
  const inner = start < end ? text.slice(start, end).trim() : "";
  const body = sanitize(inner);
  return body ? { body, viewBox } : null;
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m?.[2] ?? m?.[3];
}

function parseViewBox(tag: string): [number, number] | null {
  const vb = attr(tag, "viewBox");
  if (!vb) return null;
  const parts = vb.split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [, , w, h] = parts as number[];
  if (!w || !h || w <= 0 || h <= 0) return null;
  return [w, h];
}

function sanitize(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "")
    .trim();
}
