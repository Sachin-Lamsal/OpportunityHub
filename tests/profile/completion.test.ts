import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { getProfileCompletion } from "@/lib/profile/completion";
import type { Profile } from "@/lib/types";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "student@example.com",
    account_type: "student",
    organization_name: null,
    school_code: null,
    school_id: null,
    contact_info: null,
    organization_description: null,
    students_invite_only: false,
    education_level: null,
    dream_universities: null,
    subjects: null,
    interests: null,
    career_interests: null,
    awards: null,
    volunteer_work: null,
    leadership_roles: null,
    projects: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("student profile completion", () => {
  test("an empty profile scores zero", () => {
    const completion = getProfileCompletion(makeProfile());
    assert.ok(completion);
    assert.equal(completion.percent, 0);
    assert.equal(completion.complete, 0);
    assert.equal(completion.total, 5);
    assert.equal(completion.missing.length, 5);
  });

  test("a fully filled profile scores one hundred", () => {
    const completion = getProfileCompletion(
      makeProfile({
        education_level: "Grade 11",
        dream_universities: "TU",
        subjects: "Physics",
        interests: "Robotics",
        career_interests: "Engineering",
      }),
    );
    assert.ok(completion);
    assert.equal(completion.percent, 100);
    assert.equal(completion.missing.length, 0);
  });

  test("whitespace-only values count as missing", () => {
    const completion = getProfileCompletion(makeProfile({ subjects: "   " }));
    assert.ok(completion);
    assert.equal(
      completion.fields.find((field) => field.key === "subjects")?.complete,
      false,
    );
  });

  test("missing fields are listed in declaration order", () => {
    const completion = getProfileCompletion(
      makeProfile({ subjects: "Physics", education_level: "Grade 12" }),
    );
    assert.ok(completion);
    assert.deepEqual(
      completion.missing.map((field) => field.key),
      ["dream_universities", "interests", "career_interests"],
    );
  });

  test("school and organization accounts do not get a student meter", () => {
    assert.equal(
      getProfileCompletion(makeProfile({ account_type: "school" })),
      null,
    );
    assert.equal(
      getProfileCompletion(makeProfile({ account_type: "organization" })),
      null,
    );
    assert.equal(getProfileCompletion(null), null);
  });
});
