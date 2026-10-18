import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  describeSupabaseEnvProblem,
  getNormalizedSupabaseUrl,
  hasGeminiEnv,
  hasSupabaseEnv,
} from "@/lib/env";

/**
 * A placeholder credential must be reported as a configuration problem, not
 * silently treated as configured. With a placeholder anon key Supabase answers
 * `401 Invalid API key`, which surfaced as an empty opportunities list and a
 * confusing login failure.
 */

const saved = { ...process.env };

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeEach(() => {
  setEnv({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiJ9.real-anon-key",
    GEMINI_API_KEY: undefined,
    GOOGLE_API_KEY: undefined,
  });
});

afterEach(() => {
  process.env = { ...saved };
});

describe("Supabase environment validation", () => {
  test("real values are accepted", () => {
    assert.equal(hasSupabaseEnv(), true);
    assert.equal(describeSupabaseEnvProblem(), null);
  });

  test("the example placeholder anon key is rejected", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "REPLACE_WITH_YOUR_ANON_KEY" });
    assert.equal(hasSupabaseEnv(), false);
    assert.match(describeSupabaseEnvProblem() ?? "", /ANON_KEY/);
  });

  test("other placeholder spellings are rejected", () => {
    for (const value of [
      "your-anon-key",
      "your-anon-key-here",
      "changeme",
      "placeholder-key",
      "<your-key>",
      "   ",
    ]) {
      setEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: value });
      assert.equal(hasSupabaseEnv(), false, `"${value}" must not count as configured`);
    }
  });

  test("a placeholder project URL is rejected", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: "your-project-url" });
    assert.equal(hasSupabaseEnv(), false);
    assert.match(describeSupabaseEnvProblem() ?? "", /SUPABASE_URL/);
  });

  test("the URL is normalised for PostgREST bases", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co/rest/v1/" });
    assert.equal(getNormalizedSupabaseUrl(), "https://project.supabase.co");
    assert.equal(hasSupabaseEnv(), true);
  });

  test("the problem message never contains credential values", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "REPLACE_WITH_SECRET_VALUE_123" });
    const message = describeSupabaseEnvProblem() ?? "";
    assert.equal(message.includes("SECRET_VALUE_123"), false);
  });

  test("the Gemini key check ignores placeholders too", () => {
    assert.equal(hasGeminiEnv(), false);
    setEnv({ GEMINI_API_KEY: "your-gemini-api-key" });
    assert.equal(hasGeminiEnv(), false);
    setEnv({ GEMINI_API_KEY: "AQ.AbCdEf-1234567890" });
    assert.equal(hasGeminiEnv(), true);
  });
});
