import { test } from "node:test";
import assert from "node:assert/strict";
import { DuplicateDetector } from "@/lib/discovery/deduplication/duplicate-detector";

test("identical url and title is a duplicate", () => {
  const detector = new DuplicateDetector();
  const result = detector.compare(
    { url: "https://a.com/x", title: "X" },
    { url: "https://a.com/x", title: "X" },
  );

  assert.equal(result.isDuplicate, true);
  assert.equal(result.similarityScore, 1);
});

test("different url and title is not a duplicate", () => {
  const detector = new DuplicateDetector();
  const result = detector.compare(
    { url: "https://a.com/x", title: "X" },
    { url: "https://b.com/y", title: "Y" },
  );

  assert.equal(result.isDuplicate, false);
});

test("duplicateOfId points at the existing record", () => {
  const detector = new DuplicateDetector();
  const result = detector.compare(
    { url: "https://a.com/x", title: "X", id: "new-id" },
    { url: "https://a.com/x", title: "X", id: "existing-id" },
  );

  assert.equal(result.isDuplicate, true);
  assert.equal(result.duplicateOfId, "existing-id");
});