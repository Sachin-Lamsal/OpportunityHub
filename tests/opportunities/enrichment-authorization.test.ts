import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildEnrichmentPatch,
  isOpportunityOwner,
  AI_DERIVED_ENRICHMENT_FIELDS,
  FILLABLE_ENRICHMENT_FACT_FIELDS,
  OWNER_ONLY_ENRICHMENT_FIELDS,
} from "@/lib/opportunities/enrichment-policy";

/**
 * `save_opportunity_ai_enrichment` is SECURITY DEFINER, so the server action is
 * the only authorization boundary. These tests pin the rule that a non-owner can
 * never introduce or overwrite publisher-owned facts.
 */

const narrative = {
  ai_summary: "A short summary.",
  prep_resources: "Prep plan.",
  application_steps: "Apply online.",
  eligibility_details: "Grades 9-12.",
  portfolio_tips: "Say what you built.",
};

const facts = {
  deadline: "2026-12-01",
  start_date: "2027-01-10",
  end_date: "2027-01-20",
  cost: "$25",
  time_commitment: "6 weeks",
  location: "Kathmandu",
  grade_requirements: "Grade 11",
  skills_gained: "Public speaking",
  difficulty_level: "Advanced",
  tags: ["debate"],
  contact_info: "hello@example.org",
};

const emptyExisting = {
  source_url: null,
  deadline: null,
  start_date: null,
  end_date: null,
  cost: null,
  time_commitment: null,
  location: null,
  grade_requirements: null,
  skills_gained: null,
  difficulty_level: null,
  tags: null,
  contact_info: null,
};

describe("AI enrichment authorization (OH-101)", () => {
  test("a non-owner receives only AI-derived fields", () => {
    const patch = buildEnrichmentPatch({
      narrative,
      facts,
      existing: emptyExisting,
      isOwner: false,
      enrichedAt: "2026-10-17T00:00:00.000Z",
    });

    for (const key of Object.keys(patch)) {
      assert.ok(
        (AI_DERIVED_ENRICHMENT_FIELDS as readonly string[]).includes(key),
        `unexpected field written for a non-owner: ${key}`,
      );
    }

    assert.equal(patch.ai_summary, narrative.ai_summary);
    assert.equal(patch.ai_enriched_at, "2026-10-17T00:00:00.000Z");
  });

  test("every owner-only column is excluded from a non-owner patch", () => {
    // Guards the field lists themselves: a fact column added to
    // FILLABLE_ENRICHMENT_FACT_FIELDS without an authorization decision must
    // fail here rather than silently becoming writable by any signed-in user.
    for (const key of OWNER_ONLY_ENRICHMENT_FIELDS) {
      const patch = buildEnrichmentPatch({
        narrative,
        facts: { [key]: "attacker-value" } as Record<string, string>,
        existing: emptyExisting,
        isOwner: false,
        enrichedAt: "2026-10-17T00:00:00.000Z",
      });

      assert.equal(
        key in patch,
        false,
        `non-owner patch must never contain ${key}`,
      );
    }

    assert.equal(
      FILLABLE_ENRICHMENT_FACT_FIELDS.includes("source_url" as never),
      false,
      "source_url must never be filled from enrichment",
    );
  });

  test("a non-owner cannot set source_url, contact_info, tags or dates", () => {
    const patch = buildEnrichmentPatch({
      narrative,
      facts,
      existing: emptyExisting,
      isOwner: false,
      enrichedAt: "2026-10-17T00:00:00.000Z",
    });

    for (const key of OWNER_ONLY_ENRICHMENT_FIELDS) {
      assert.equal(
        key in patch,
        false,
        `non-owner patch must not contain ${key}`,
      );
    }
  });

  test("source_url is never written from enrichment, even for the owner", () => {
    const patch = buildEnrichmentPatch({
      narrative,
      facts,
      existing: emptyExisting,
      isOwner: true,
      enrichedAt: "2026-10-17T00:00:00.000Z",
    });

    assert.equal(
      "source_url" in patch,
      false,
      "the publisher's official source link must never be overwritten",
    );
  });

  test("the owner fills empty facts from enrichment", () => {
    const patch = buildEnrichmentPatch({
      narrative,
      facts,
      existing: emptyExisting,
      isOwner: true,
      enrichedAt: "2026-10-17T00:00:00.000Z",
    });

    assert.equal(patch.deadline, "2026-12-01");
    assert.equal(patch.cost, "$25");
    assert.equal(patch.location, "Kathmandu");
    assert.deepEqual(patch.tags, ["debate"]);
  });

  test("the owner never overwrites facts that already exist", () => {
    const patch = buildEnrichmentPatch({
      narrative,
      facts,
      existing: {
        ...emptyExisting,
        deadline: "2026-01-15",
        cost: "Free",
        tags: ["official"],
      },
      isOwner: true,
      enrichedAt: "2026-10-17T00:00:00.000Z",
    });

    assert.equal("deadline" in patch, false);
    assert.equal("cost" in patch, false);
    assert.equal("tags" in patch, false);
    // Still fills the genuinely empty ones.
    assert.equal(patch.location, "Kathmandu");
  });

  test("blank model output is treated as absent", () => {
    const patch = buildEnrichmentPatch({
      narrative: { ai_summary: "Summary", prep_resources: null },
      facts: { ...facts, cost: "   ", tags: [] },
      existing: emptyExisting,
      isOwner: true,
      enrichedAt: "2026-10-17T00:00:00.000Z",
    });

    assert.equal("cost" in patch, false);
    assert.equal("tags" in patch, false);
    assert.equal(patch.ai_summary, "Summary");
  });

  test("ownership requires a real created_by match", () => {
    assert.equal(isOpportunityOwner({ created_by: "owner" }, "owner"), true);
    assert.equal(isOpportunityOwner({ created_by: "owner" }, "someone-else"), false);
    assert.equal(isOpportunityOwner({ created_by: null }, "owner"), false);
    assert.equal(isOpportunityOwner({ created_by: "owner" }, null), false);
    assert.equal(isOpportunityOwner({ created_by: "owner" }, ""), false);
  });
});