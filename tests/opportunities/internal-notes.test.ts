import { test } from "node:test";
import assert from "node:assert/strict";

import { withoutInternalNotes } from "@/lib/opportunities/internal-notes";

/**
 * The admin review note is written for the owning publisher only. Public browse
 * and detail queries select `*`, so the note must be stripped before the row is
 * handed to a public page. This suite imports the production helper directly, so
 * a change to the redaction is caught here.
 */
test("admin review notes are removed from public rows", () => {
  const [stripped] = withoutInternalNotes([
    {
      id: "a",
      title: "Robotics scholarship",
      is_verified: true,
      review_note: "internal: publisher must upload a tax form",
    },
  ]);

  assert.equal("review_note" in stripped, false);
  assert.equal(stripped.title, "Robotics scholarship");
});

test("a null review note is removed too", () => {
  const [stripped] = withoutInternalNotes([{ id: "a", review_note: null }]);
  assert.equal("review_note" in stripped, false);
});

test("other fields are preserved untouched", () => {
  const [stripped] = withoutInternalNotes([
    { id: "a", title: "T", description: "D", raw_source_text: "raw", tags: ["x"] },
  ]);
  assert.deepEqual(stripped, {
    id: "a",
    title: "T",
    description: "D",
    raw_source_text: "raw",
    tags: ["x"],
  });
});

test("null and primitive rows do not throw", () => {
  assert.deepEqual(withoutInternalNotes([null, "x"]), [null as never, "x" as never]);
});
