#!/usr/bin/env node
/**
 * Quick Gemini connectivity test. Run: node scripts/test-gemini.mjs
 * Reads GEMINI_API_KEY from .env.local without printing the key.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("Could not read .env.local");
    process.exit(1);
  }
}

loadEnvLocal();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("FAIL: No GEMINI_API_KEY in .env.local");
  process.exit(1);
}

console.log("Key format:", apiKey.startsWith("AQ.") ? "AQ. (auth key)" : apiKey.startsWith("AIza") ? "AIza (standard)" : "other");
console.log("Testing Gemini API…");

const models = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
];

for (const model of models) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Reply with exactly: OK" }] }],
    }),
  });

  const data = await res.json();

  if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.log(`OK: ${model} works`);
    console.log("Sample:", data.candidates[0].content.parts[0].text.slice(0, 80));
    process.exit(0);
  }

  console.log(`FAIL: ${model} — ${data.error?.message ?? res.status}`);
}

console.error("\nAll models failed. Check key permissions in Google AI Studio.");
process.exit(1);
