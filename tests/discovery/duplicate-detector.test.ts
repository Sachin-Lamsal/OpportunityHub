// Tests for duplicate detection (assertion-based, verified manually)
// Run: node -e "require('./duplicate-detector.test.ts')" after transpilation

import { DuplicateDetector } from "@/lib/discovery/deduplication/duplicate-detector";

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) throw new Error(`FAIL ${msg}: expected ${String(expected)}, got ${String(actual)}`);
}

// Manually verified assertions (no live DB required for core logic)
const detector = new DuplicateDetector();
const d1 = detector.compare({ url: "https://a.com/x", title: "X" }, { url: "https://a.com/x", title: "X" });
assertEqual(d1.isDuplicate, true, "same url+title");

const d2 = detector.compare({ url: "https://a.com/x", title: "X" }, { url: "https://b.com/y", title: "Y" });
assertEqual(d2.isDuplicate, false, "different url+title");

console.log("duplicate-detector assertions passed (manual verification)");
