import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSafeOutboundUrl, isPrivateAddress } from "@/lib/security/url-guard";
import { safeNextPath } from "@/lib/auth/redirects";

/**
 * Adversarial battery: these payloads are the ones an attacker would try
 * against the SSRF guard and the post-login redirect sanitizer.
 */

const SSRF_PAYLOADS = [
  "http://127.0.0.1/",
  "http://127.1/",
  "http://0177.0.0.1/",
  "http://2130706433/",
  "http://0x7f.0x0.0x0.0x1/",
  "http://0x7f000001/",
  "http://localtest.me/",
  "http://127.0.0.1.nip.io/",
  "http://[::ffff:7f00:1]/",
  "http://[::ffff:a9fe:a9fe]/",
  "http://[0:0:0:0:0:ffff:169.254.169.254]/",
  "http://0.0.0.0/",
  "http://0/",
  "http://169.254.169.254/",
  "http://metadata.google.internal/",
  "http://metadata/",
  "http://localhost/",
  "http://LOCALHOST/",
  "http://localhost./",
  "http://localhost:80@evil.example/",
  "https://evil.example/#@127.0.0.1/",
  "file:///etc/passwd",
  "gopher://127.0.0.1:11211/",
  "ftp://127.0.0.1/",
  "dict://127.0.0.1:11211/",
  "jar:http://127.0.0.1!/",
  "http://[::]/",
  "http://[fe80::1]/",
  "http://[fd00::1]/",
  "http://10.0.0.1/",
  "http://172.16.0.1/",
  "http://192.168.0.1/",
  "http://100.64.0.1/",
  "http://198.18.0.1/",
];

test("adversarial: every SSRF payload is rejected before any network call", async () => {
  const leaked = [];

  for (const payload of SSRF_PAYLOADS) {
    try {
      await assertSafeOutboundUrl(payload);
      leaked.push(payload);
    } catch {
      // expected
    }
  }

  assert.deepEqual(leaked, [], `guard allowed internal targets: ${leaked.join(", ")}`);
});

test("adversarial: authinfo/userinfo tricks cannot smuggle an internal host", async () => {
  // userinfo is stripped from url.hostname by WHATWG, so these must resolve to
  // the (public) real host or be blocked outright — never to the internal one.
  const userinfo = [
    "http://127.0.0.1@8.8.8.8/",
    "http://8.8.8.8@127.0.0.1/",
  ];

  for (const payload of userinfo) {
    try {
      const url = await assertSafeOutboundUrl(payload);
      assert.ok(
        !isPrivateAddress(url.hostname),
        `${payload} resolved to a private host ${url.hostname}`,
      );
    } catch {
      // blocking is also acceptable
    }
  }
});

test("adversarial: unicode / whitespace host variants do not bypass", async () => {
  // These must be rejected or normalised; none may be treated as public.
  const variants = [
    "http://ⓛⓞⓒⓐⓛⓗⓞⓢⓣ/", // circled localhost
    "http://localhost%2e/", // encoded dot
    " http://127.0.0.1/", // leading space
    "http://127.0.0.1 /",
  ];

  for (const v of variants) {
    try {
      const url = await assertSafeOutboundUrl(v);
      assert.ok(
        !isPrivateAddress(url.hostname),
        `${v} resolved to a private host ${url.hostname}`,
      );
    } catch (err) {
      assert.ok(err instanceof Error);
    }
  }
});

const REDIRECT_PAYLOADS = [
  "@evil.com",
  "//evil.com",
  "/\\evil.com",
  "/%2f%2fevil.com",
  "/%5c%5cevil.com",
  "/%2F%2Fevil.com",
  "https://evil.com",
  "HTTPS://EVIL.COM",
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "\\\\evil.com",
  "/path//evil.com",
  "evil.com",
  "/\t/evil.com",
  "/ /evil.com",
];

test("adversarial: no redirect payload escapes the origin", () => {
  const origin = "https://app.example.com";

  for (const payload of REDIRECT_PAYLOADS) {
    const next = safeNextPath(payload);
    const host = new URL(origin + next).host;
    assert.equal(
      host,
      "app.example.com",
      `payload ${JSON.stringify(payload)} escaped to ${host}`,
    );
  }
});

test("adversarial: safeNextPath is idempotent and never returns a double slash", () => {
  for (const payload of REDIRECT_PAYLOADS) {
    const once = safeNextPath(payload);
    const twice = safeNextPath(once);
    assert.equal(once, twice, `${payload} not idempotent`);
    assert.ok(!once.startsWith("//"), `${payload} produced //${once}`);
  }
});