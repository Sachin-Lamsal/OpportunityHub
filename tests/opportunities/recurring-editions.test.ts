import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("recurring opportunity edition series logic", () => {
  function resolveRootParentId(parent: { id: string; parent_opportunity_id?: string | null }): string {
    return parent.parent_opportunity_id ?? parent.id;
  }

  function canSpawnEdition(
    parent: {
      created_by: string;
      is_verified?: boolean;
      verification_status?: string;
      lifecycle_status?: string;
    },
    currentUserId: string,
  ): boolean {
    const isOwner = parent.created_by === currentUserId;
    const isVerifiedOrPublic =
      Boolean(parent.is_verified) ||
      parent.verification_status === "verified" ||
      parent.lifecycle_status === "published";
    return isOwner || isVerifiedOrPublic;
  }

  function determineEditionSubmissionState(intent: "review" | "draft") {
    return {
      lifecycle_status: intent === "review" ? "pending_review" : "draft",
      is_verified: false,
      verification_status: "unverified",
    };
  }

  test("a root opportunity becomes the series parent for the next edition", () => {
    const root = { id: "root-123", parent_opportunity_id: null };
    assert.equal(resolveRootParentId(root), "root-123");
  });

  test("nested editions always attach to the original root series parent", () => {
    // Edition 2025 points to root
    const edition2025 = { id: "ed-2025", parent_opportunity_id: "root-123" };
    // Spawning Edition 2026 from 2025 should still resolve to root-123
    assert.equal(resolveRootParentId(edition2025), "root-123");
  });

  test("creators can spawn editions from their own listings", () => {
    const myDraft = {
      created_by: "user-abc",
      is_verified: false,
      verification_status: "unverified",
      lifecycle_status: "draft",
    };
    assert.equal(canSpawnEdition(myDraft, "user-abc"), true);
  });

  test("users can spawn new editions from verified public opportunities", () => {
    const publicVerified = {
      created_by: "admin-xyz",
      is_verified: true,
      verification_status: "verified",
      lifecycle_status: "published",
    };
    assert.equal(canSpawnEdition(publicVerified, "student-123"), true);
  });

  test("users cannot spawn editions from unverified drafts created by someone else", () => {
    const otherPrivateDraft = {
      created_by: "someone-else",
      is_verified: false,
      verification_status: "unverified",
      lifecycle_status: "draft",
    };
    assert.equal(canSpawnEdition(otherPrivateDraft, "student-123"), false);
  });

  test("new edition submissions always enter the verification queue (never auto-verified)", () => {
    const reviewSubmission = determineEditionSubmissionState("review");
    assert.equal(reviewSubmission.lifecycle_status, "pending_review");
    assert.equal(reviewSubmission.is_verified, false);
    assert.equal(reviewSubmission.verification_status, "unverified");

    const draftSubmission = determineEditionSubmissionState("draft");
    assert.equal(draftSubmission.lifecycle_status, "draft");
    assert.equal(draftSubmission.is_verified, false);
    assert.equal(draftSubmission.verification_status, "unverified");
  });
});
