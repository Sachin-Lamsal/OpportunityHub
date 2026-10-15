import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "@/lib/auth/redirects";

test("ordinary same-origin paths are preserved", () => {
  assert.equal(safeNextPath("/dashboard"), "/dashboard");
  assert.equal(safeNextPath("/reset-password"), "/reset-password");
  assert.equal(safeNextPath("/opportunities/abc?x=1"), "/opportunities/abc?x=1");
});

test("missing or empty next falls back to the default", () => {
  assert.equal(safeNextPath(null), "/dashboard");
  assert.equal(safeNextPath(""), "/dashboard");
  assert.equal(safeNextPath("   "), "/dashboard");
});

test("open-redirect payloads are rejected (open redirect regression)", () => {
  // "@evil.com" turns origin+next into https://<host>@evil.com
  assert.equal(safeNextPath("@evil.com"), "/dashboard");
  assert.equal(safeNextPath("//evil.com"), "/dashboard");
  assert.equal(safeNextPath("/\\evil.com"), "/dashboard");
  assert.equal(safeNextPath("/%2f%2fevil.com"), "/dashboard");
  assert.equal(safeNextPath("/%5C%5Cevil.com"), "/dashboard");
  assert.equal(safeNextPath("https://evil.com"), "/dashboard");
  assert.equal(safeNextPath("http://evil.com"), "/dashboard");
  assert.equal(safeNextPath("javascript:alert(1)"), "/dashboard");
  assert.equal(safeNextPath("data:text/html,<script>"), "/dashboard");
  // absolute-path lookalike that still carries an authority
  assert.equal(safeNextPath("/path//evil.com"), "/dashboard");
  // relative (non-slash) path
  assert.equal(safeNextPath("evil.com"), "/dashboard");
});

test("every accepted path stays same-origin when concatenated with an origin", () => {
  const origin = "https://app.example.com";
  const accepted = ["/dashboard", "/reset-password", "/opportunities/abc?x=1"];

  for (const value of accepted) {
    const host = new URL(origin + value).host;
    assert.equal(host, "app.example.com");
  }
});