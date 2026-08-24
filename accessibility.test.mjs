import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

assert.match(html, /<html[^>]+lang="zh-Hant"/i, "document language must be declared");
assert.match(html, /class="skip-link"/, "skip link is required");
assert.match(html, /<main[^>]+id="main-content"/, "main landmark needs a stable target");
assert.match(
  html,
  /id="status"[^>]+aria-live="polite"/,
  "non-fatal status must be announced",
);
assert.match(html, /id="fatalStatus"[^>]+role="alert"/, "fatal errors must use an alert role");
assert.match(html, /id="appLoading"[^>]+role="status"/, "loading state must be announced");
assert.match(
  html,
  /<dialog[^>]+aria-labelledby="courseDialogTitle"/,
  "dialog needs an accessible name",
);
assert.doesNotMatch(html, /\sonclick=/i, "inline click handlers are not allowed");
assert.match(html, /id="printProgress"/, "print action must be keyboard-accessible");

const labelCount = (html.match(/<label\b/gi) || []).length;
const inputCount = (html.match(/<(?:input|select|textarea)\b/gi) || []).length;
assert.ok(labelCount >= 20, "interactive forms should retain visible labels");
assert.ok(inputCount >= labelCount, "form-control count unexpectedly dropped");

console.log("basic accessibility audit passed");
