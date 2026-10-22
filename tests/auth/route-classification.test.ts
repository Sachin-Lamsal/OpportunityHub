import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  isStudentAppRoute,
  isSchoolAppRoute,
  isOrgAppRoute,
  studentNeedsOnboardingGate,
  dashboardPathFor,
  canManageOpportunities,
} from "@/lib/auth/account";

/**
 * Route classification drives the role redirects in the proxy. A route that is
 * not classified correctly either leaks a student-only page to a publisher
 * account or blocks a student from a page they own.
 */
describe("route classification", () => {
  test("student pages are classified as student routes", () => {
    for (const path of [
      "/dashboard",
      "/portfolio",
      "/portfolio/add",
      "/cv-builder",
      "/ai-suggestions",
      "/profile",
      "/saved",
    ]) {
      assert.equal(isStudentAppRoute(path), true, `${path} should be a student route`);
    }
  });

  test("the saved page is gated behind the student onboarding wizard", () => {
    assert.equal(studentNeedsOnboardingGate("/saved"), true);
  });

  test("public routes are not gated behind onboarding", () => {
    assert.equal(studentNeedsOnboardingGate("/opportunities"), false);
    assert.equal(studentNeedsOnboardingGate("/onboarding"), false);
    assert.equal(studentNeedsOnboardingGate("/org/11111111-1111-4111-8111-111111111111"), false);
  });

  test("a route that merely starts with the same letters is not a student route", () => {
    // "/savedxyz" must not be treated as the saved page.
    assert.equal(isStudentAppRoute("/savedxyz"), false);
    assert.equal(isStudentAppRoute("/saved-items"), false);
  });

  test("publisher pages are not student routes", () => {
    assert.equal(isStudentAppRoute("/school/dashboard"), false);
    assert.equal(isStudentAppRoute("/org/dashboard"), false);
    assert.equal(isStudentAppRoute("/opportunities"), false);
  });

  test("school and organization pages are classified separately", () => {
    assert.equal(isSchoolAppRoute("/school/dashboard"), true);
    assert.equal(isSchoolAppRoute("/school/students"), true);
    assert.equal(isSchoolAppRoute("/org/dashboard"), false);

    assert.equal(isOrgAppRoute("/org/dashboard"), true);
    assert.equal(isOrgAppRoute("/org/profile"), true);
    assert.equal(isOrgAppRoute("/school/dashboard"), false);
  });

  test("a public publisher profile is not treated as a management page", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    assert.equal(isSchoolAppRoute(`/school/${uuid}`), false);
    assert.equal(isOrgAppRoute(`/org/${uuid}`), false);
    assert.equal(isStudentAppRoute(`/org/${uuid}`), false);
  });

  test("the dashboard path follows the account type", () => {
    assert.equal(dashboardPathFor("student"), "/dashboard");
    assert.equal(dashboardPathFor("school"), "/school/dashboard");
    assert.equal(dashboardPathFor("organization"), "/org/dashboard");
    assert.equal(dashboardPathFor(null), "/dashboard");
  });

  test("only schools and organizations manage opportunities", () => {
    assert.equal(canManageOpportunities("school"), true);
    assert.equal(canManageOpportunities("organization"), true);
    assert.equal(canManageOpportunities("student"), false);
    assert.equal(canManageOpportunities(null), false);
  });
});
