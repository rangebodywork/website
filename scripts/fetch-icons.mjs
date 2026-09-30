// Downloads a Material Symbols Outlined variable font subset containing only
// the glyphs listed in lib/icons.ts, so icons are self-hosted via next/font/local.
// Usage: npm run icons
import { readFile, writeFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/icons.ts", import.meta.url), "utf8");
const names = [...source.matchAll(/^\s*"([a-z0-9_]+)",$/gm)].map((m) => m[1]).sort();
if (names.length === 0) throw new Error("No icon names found in lib/icons.ts");

const cssUrl =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" +
  `&icon_names=${names.join(",")}&display=block`;

// A modern UA makes Google Fonts serve woff2.
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};
const css = await (await fetch(cssUrl, { headers })).text();
const fontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
if (!fontUrl) throw new Error(`Unexpected Google Fonts response:\n${css}`);

const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
const out = new URL("../app/fonts/material-symbols-outlined.woff2", import.meta.url);
await writeFile(out, font);
console.log(`Wrote ${names.length} icons (${(font.length / 1024).toFixed(1)} KB) to ${out.pathname}`);
