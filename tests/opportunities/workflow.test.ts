import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPublicLifecycleStatus,
  isSubmissionIntent,
  lifecycleLabel,
} from "@/lib/opportunities/workflow";

test("only published and historical listings are public", () => {
  assert.equal(isPublicLifecycleStatus("published"), true);
  assert.equal(isPublicLifecycleStatus("expired"), true);
  assert.equal(isPublicLifecycleStatus("archived"), true);
  assert.equal(isPublicLifecycleStatus("draft"), false);
  assert.equal(isPublicLifecycleStatus("pending_review"), false);
  assert.equal(isPublicLifecycleStatus("cancelled"), false);
});

test("submission intents and labels are constrained to known workflow values", () => {
  assert.equal(isSubmissionIntent("draft"), true);
  assert.equal(isSubmissionIntent("review"), true);
  assert.equal(isSubmissionIntent("published"), false);
  assert.equal(lifecycleLabel("pending_review"), "Pending review");
  assert.equal(lifecycleLabel(undefined), "Draft");
});
