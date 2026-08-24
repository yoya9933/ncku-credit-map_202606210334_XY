import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const notFound = await readFile(new URL("./404.html", import.meta.url), "utf8");
const css = await readFile(new URL("./style.css", import.meta.url), "utf8");

assert.match(html, /<html lang="zh-Hant">/);
assert.match(html, /class="skip-link" href="#main-content"/);
assert.match(html, /<main id="main-content"/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /role="alert"/);
assert.match(html, /<meta name="description"/);
assert.match(html, /property="og:title"/);
assert.match(html, /property="og:description"/);
assert.match(html, /rel="icon" href="favicon\.svg"/);
assert.match(html, /id="printProgress"/);
assert.doesNotMatch(html, /onclick=/);

for (const match of html.matchAll(/<img\b[^>]*>/g)) {
  assert.match(match[0], /\balt=/, `Image missing alt text: ${match[0]}`);
}

assert.match(css, /:focus-visible/);
assert.match(css, /@media print/);
assert.match(css, /prefers-reduced-motion/);
assert.match(notFound, /404/);
assert.match(notFound, /回到學分地圖/);

console.log("P5 static quality checks passed");
