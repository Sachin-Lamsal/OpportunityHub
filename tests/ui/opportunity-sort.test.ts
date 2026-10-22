import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  applyOpportunityFilters,
  browseStatesEqual,
  isOpportunitySort,
  opportunitySortLabel,
  readOpportunitySort,
  readOpportunitySortParams,
} from "@/lib/opportunities/filters";

/**
 * Sorting is kept out of the filter keys on purpose: sorting does not narrow
 * the result set, so "Clear all" must not silently reset the chosen order.
 */
describe("opportunity sort query string", () => {
  test("reading a supported sort returns it", () => {
    assert.equal(readOpportunitySort("sort=deadline"), "deadline");
    assert.equal(readOpportunitySort("q=robotics&sort=title"), "title");
  });

  test("a missing sort falls back to the default", () => {
    assert.equal(readOpportunitySort(""), "newest");
    assert.equal(readOpportunitySort("q=robotics"), "newest");
  });

  test("an unknown sort falls back to the default", () => {
    assert.equal(readOpportunitySort("sort=random"), "newest");
    assert.equal(isOpportunitySort("random"), false);
    assert.equal(isOpportunitySort("deadline"), true);
  });

  test("reading from searchParams handles repeated and missing values", () => {
    assert.equal(readOpportunitySortParams({ sort: "title" }), "title");
    assert.equal(readOpportunitySortParams({ sort: ["deadline", "title"] }), "deadline");
    assert.equal(readOpportunitySortParams({}), "newest");
    assert.equal(readOpportunitySortParams({ sort: undefined }), "newest");
  });

  test("applying a sort writes it and keeps the filters", () => {
    const next = applyOpportunityFilters("q=robotics", { sort: "deadline" });
    const params = new URLSearchParams(next);
    assert.equal(params.get("sort"), "deadline");
    assert.equal(params.get("q"), "robotics");
  });

  test("the default sort is not written to the URL", () => {
    const next = applyOpportunityFilters("sort=deadline&q=robotics", {
      sort: "newest",
    });
    const params = new URLSearchParams(next);
    assert.equal(params.has("sort"), false);
    assert.equal(params.get("q"), "robotics");
  });

  test("an unknown sort is dropped instead of being forwarded to the query", () => {
    const next = applyOpportunityFilters("q=robotics", { sort: "nonsense" });
    const params = new URLSearchParams(next);
    assert.equal(params.has("sort"), false);
    assert.equal(params.get("q"), "robotics");
  });

  test("sort is not treated as an active filter", () => {
    // `hasActiveOpportunityFilters` only looks at the narrowing keys, so a
    // sorted-only URL must not show the "Clear all" button.
    const next = applyOpportunityFilters("", { sort: "deadline" });
    assert.equal(next, "sort=deadline");
  });

  test("sort labels describe the order in plain language", () => {
    assert.equal(opportunitySortLabel("newest"), "newest first");
    assert.equal(opportunitySortLabel("deadline"), "soonest deadline first");
    assert.equal(opportunitySortLabel("title"), "title A–Z");
  });
});

/**
 * The filter form uses this to tell its own navigation apart from a URL
 * change it did not cause (browser Back/Forward, a curated link). It has to
 * compare by value, otherwise a different parameter order or encoding would
 * look like a different browse state.
 */
describe("comparing browse states", () => {
  test("the same filters and sort are the same state", () => {
    assert.equal(browseStatesEqual("q=robotics&sort=title", "q=robotics&sort=title"), true);
  });

  test("a different parameter order is still the same state", () => {
    assert.equal(browseStatesEqual("q=robotics&sort=title", "sort=title&q=robotics"), true);
  });

  test("a different filter value is a different state", () => {
    assert.equal(browseStatesEqual("q=robotics", "q=debate"), false);
  });

  test("a different sort is a different state", () => {
    assert.equal(browseStatesEqual("q=robotics&sort=title", "q=robotics&sort=deadline"), false);
  });

  test("a missing sort and the default sort are the same state", () => {
    assert.equal(browseStatesEqual("q=robotics", "q=robotics&sort=newest"), true);
  });

  test("an empty state and a filtered state are different", () => {
    assert.equal(browseStatesEqual("", "q=robotics"), false);
  });
});
