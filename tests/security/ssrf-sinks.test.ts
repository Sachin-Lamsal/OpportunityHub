import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Structural regression guard.
 *
 * Cycle 2 of the audit found four additional SSRF sinks that had been missed:
 *   lib/discovery/sources/rss-adapter.ts
 *   lib/discovery/sources/facebook-boundary.ts
 *   lib/discovery/verification/evidence-verifier.ts
 *   lib/ingestion/ocr.ts   (fetches a user-supplied image URL)
 *
 * This test walks the source tree and fails if any module performs a raw
 * `fetch(` against a non-constant URL. That makes it cheap to re-audit after
 * future changes instead of relying on someone remembering to grep.
 */

/** Hosts we legitimately talk to with a raw fetch (fixed endpoints, not user input). */
const ALLOWED_RAW_FETCH_HOSTS = [
  "api.brevo.com",          // transactional email
  "GEMINI_API_BASE",        // AI provider
  "api.resend.com",         // transactional email
];

const LIB_DIR = path.join(process.cwd(), "lib");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("no module performs a raw fetch against a non-constant URL", () => {
  const offenders: string[] = [];

  for (const file of walk(LIB_DIR)) {
    const source = stripComments(readFileSync(file, "utf8"));
    const relative = path.relative(process.cwd(), file);

    // find `fetch(` calls and check the first argument
    const callPattern = /\bfetch\(\s*([^,)]+)/g;
    let match: RegExpExecArray | null;

    while ((match = callPattern.exec(source)) !== null) {
      const argument = match[1].trim();

      const allowed = ALLOWED_RAW_FETCH_HOSTS.some(
        (host) => argument.includes(host) || argument.includes('"https://api.'),
      );
      if (allowed) continue;

      // `fetch(url, ...)` where `url` is a local built from the fixed provider
      // base is safe. Resolve simple `const url = `<GEMINI_API_BASE>...``
      // assignments rather than blanket-allowing the name "url".
      const identifier = argument.replace(/[^A-Za-z0-9_$]/g, "");
      if (identifier) {
        const assignment = new RegExp(
          `\\b${identifier}\\s*=\\s*[^;]*GEMINI_API_BASE`,
        );
        if (assignment.test(source)) continue;
      }

      // A raw fetch is acceptable only if it is clearly hitting a fixed,
      // server-constructed endpoint. Anything referencing a variable that could
      // carry user input must go through safeFetch instead.
      const looksUserControlled = /\b(url|Url|feedUrl|publicPageUrl|evidenceUrl|imageUrl|sourceUrl|pageUrl|href|target)\b/.test(
        argument,
      );

      if (looksUserControlled) {
        offenders.push(`${relative}: fetch(${argument})`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Raw fetch against a potentially user-controlled URL found:\n${offenders.join("\n")}\n` +
      "Use safeFetch() from @/lib/security/safe-fetch instead.",
  );
});

test("every discovery/ingestion adapter routes through safeFetch", () => {
  const guarded = [
    "lib/ingestion/scraper.ts",
    "lib/ingestion/ocr.ts",
    "lib/ai/fetch-page-text.ts",
    "lib/discovery/sources/rss-adapter.ts",
    "lib/discovery/sources/facebook-boundary.ts",
    "lib/discovery/verification/evidence-verifier.ts",
  ];

  for (const relative of guarded) {
    const source = readFileSync(path.join(process.cwd(), relative), "utf8");
    assert.ok(
      source.includes('from "@/lib/security/safe-fetch"'),
      `${relative} must import safeFetch`,
    );
  }
});

test("AI provider calls are metered", () => {
  // Every module that calls Gemini directly must require an authenticated user.
  const metered = ["lib/ingestion/formatter.ts", "lib/ingestion/ocr.ts"];

  for (const relative of metered) {
    const source = readFileSync(path.join(process.cwd(), relative), "utf8");
    assert.ok(
      source.includes("runMeteredAi"),
      `${relative} must meter its provider call`,
    );
    assert.ok(
      /userId\s*:\s*string/.test(source),
      `${relative} must require an authenticated userId`,
    );
  }
});