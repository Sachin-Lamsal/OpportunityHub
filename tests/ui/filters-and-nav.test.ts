import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  applyOpportunityFilters,
  hasActiveFilterParams,
  hasActiveOpportunityFilters,
  readOpportunityFilters,
} from "@/lib/opportunities/filters";
import { activeNavHref } from "@/lib/nav";
import { STUDENT_NAV_LINKS, SCHOOL_NAV_LINKS } from "@/lib/constants";

describe("opportunity filter query string", () => {
  test("applying a filter writes it and keeps the others", () => {
    const next = applyOpportunityFilters("q=robotics", {
      q: "robotics",
      subject: "Technology",
    });
    const params = new URLSearchParams(next);
    assert.equal(params.get("q"), "robotics");
    assert.equal(params.get("subject"), "Technology");
  });

  test("clearing a filter deletes the key instead of writing an empty value", () => {
    const next = applyOpportunityFilters("q=robotics&subject=Science&type=Workshop", {
      subject: "",
      type: "Workshop",
    });
    const params = new URLSearchParams(next);
    assert.equal(params.has("subject"), false);
    assert.equal(params.get("type"), "Workshop");
  });

  test("whitespace-only values are treated as empty", () => {
    const next = applyOpportunityFilters("q=robotics", { q: "   " });
    assert.equal(new URLSearchParams(next).has("q"), false);
  });

  test("clearing every filter returns an empty query string", () => {
    const next = applyOpportunityFilters("q=a&subject=b&type=c&deadline=week&format=online", {
      q: "",
      subject: "",
      type: "",
      deadline: "",
      format: "",
    });
    assert.equal(next, "");
  });

  test("values are trimmed", () => {
    const next = applyOpportunityFilters("", { q: "  debate  " });
    assert.equal(new URLSearchParams(next).get("q"), "debate");
  });

  test("unknown extra params are preserved", () => {
    const next = applyOpportunityFilters("page=2", { q: "ai" });
    assert.equal(new URLSearchParams(next).get("page"), "2");
  });

  test("active-filter detection ignores empty values", () => {
    assert.equal(hasActiveOpportunityFilters(""), false);
    assert.equal(hasActiveOpportunityFilters("subject="), false);
    assert.equal(hasActiveOpportunityFilters("q="), false);
    assert.equal(hasActiveOpportunityFilters("q=%20"), false);
    assert.equal(hasActiveOpportunityFilters("subject=Science"), true);
  });

  test("the server page and the filter form agree on what is active", () => {
    // `app/(app)/opportunities/page.tsx` uses hasActiveFilterParams on the raw
    // searchParams object; the form uses the query-string variant. They must
    // never disagree, or "Clear all" disappears while the page claims a filter
    // is applied.
    for (const query of [
      "",
      "q=",
      "q=%20",
      "subject=Science",
      "q=robotics&subject=Science",
      "unknown=1",
    ]) {
      const fromParams = hasActiveFilterParams(
        Object.fromEntries(new URLSearchParams(query).entries()),
      );
      assert.equal(
        fromParams,
        hasActiveOpportunityFilters(query),
        `disagreement for ?${query}`,
      );
    }

    assert.equal(hasActiveFilterParams({ q: ["robotics"] }), true);
    assert.equal(hasActiveFilterParams({ q: undefined }), false);
  });

  test("reading filters back from a query string round-trips", () => {
    const written = applyOpportunityFilters("", {
      q: "robotics",
      subject: "Technology",
      type: "",
      deadline: "",
      format: "",
    });

    assert.deepEqual(readOpportunityFilters(written), {
      q: "robotics",
      subject: "Technology",
      type: "",
      deadline: "",
      format: "",
    });
  });
});

describe("active navigation item", () => {
  test("a nested route highlights only the most specific link", () => {
    // Regression: `/opportunities/new` used to highlight both "Add opportunity"
    // and "Browse" for publisher accounts.
    const active = activeNavHref("/opportunities/new", SCHOOL_NAV_LINKS, "/school/dashboard");
    const highlighted = SCHOOL_NAV_LINKS.filter((l) => l.href === active);
    assert.equal(highlighted.length, 1);
    assert.equal(active, "/opportunities/new");
  });

  test("a parent section highlights when no child link matches", () => {
    assert.equal(
      activeNavHref("/opportunities", SCHOOL_NAV_LINKS, "/school/dashboard"),
      "/opportunities",
    );
    assert.equal(
      activeNavHref("/opportunities/abc/edit", SCHOOL_NAV_LINKS, "/school/dashboard"),
      "/opportunities",
    );
  });

  test("exactly one link is active at most", () => {
    for (const path of [
      "/dashboard",
      "/portfolio",
      "/portfolio/add",
      "/cv-builder",
      "/ai-suggestions",
      "/profile",
      "/onboarding",
      "/school/students/123",
    ]) {
      const active = activeNavHref(path, SCHOOL_NAV_LINKS, "/school/dashboard");
      const count = SCHOOL_NAV_LINKS.filter((l) => l.href === active).length;
      assert.ok(count <= 1, `${path} highlighted ${count} items`);
    }
  });

  test("exact matches win over prefix matches", () => {
    const links = [{ href: "/dashboard" }, { href: "/dashboard/settings" }];
    assert.equal(activeNavHref("/dashboard", links, "/dashboard"), "/dashboard");
    assert.equal(
      activeNavHref("/dashboard/settings", links, "/dashboard"),
      "/dashboard/settings",
    );
  });

  test("a partial segment does not count as a match", () => {
    // "/opportunitiesx" must not light up "/opportunities".
    assert.equal(activeNavHref("/opportunitiesx", STUDENT_NAV_LINKS, "/dashboard"), null);
  });

  test("an unrelated path highlights nothing", () => {
    assert.equal(activeNavHref("/cv-builder", SCHOOL_NAV_LINKS, "/school/dashboard"), null);
  });
});