import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UnsafeUrlError,
  assertSafeOutboundUrl,
  isPrivateAddress,
} from "@/lib/security/url-guard";

test("private and reserved IPv4 ranges are detected", () => {
  const privateIps = [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.254",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
  ];

  for (const ip of privateIps) {
    assert.equal(isPrivateAddress(ip), true, `${ip} should be private`);
  }
});

test("public IPv4 addresses are not flagged", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34"]) {
    assert.equal(isPrivateAddress(ip), false, `${ip} should be public`);
  }
});

test("loopback, link-local and unique-local IPv6 are detected", () => {
  for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, `${ip} should be private`);
  }
});

test("IPv4-mapped IPv6 is decoded before classification", () => {
  // ::ffff:127.0.0.1 (WHATWG-serialised as ::ffff:7f00:1)
  assert.equal(isPrivateAddress("::ffff:7f00:1"), true);
  // ::ffff:169.254.169.254
  assert.equal(isPrivateAddress("::ffff:a9fe:a9fe"), true);
  // ::ffff:10.0.0.1
  assert.equal(isPrivateAddress("::ffff:a00:1"), true);
  // ::ffff:8.8.8.8 is public and must NOT be blocked
  assert.equal(isPrivateAddress("::ffff:808:808"), false);
});

test("public IPv6 addresses are not flagged", () => {
  for (const ip of [
    "2001:4860:4860::8888",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
  ]) {
    assert.equal(isPrivateAddress(ip), false, `${ip} should be public`);
  }
});

test("unparsable IPv6 literals fail closed", () => {
  assert.equal(isPrivateAddress("::not-an-address"), true);
  assert.equal(isPrivateAddress("1:2:3"), true);
});

test("trailing-dot internal hostnames are still blocked", async () => {
  // "localhost." is a valid FQDN form of localhost; it must not slip past
  // the hostname denylist.
  await assert.rejects(
    () => assertSafeOutboundUrl("http://localhost./admin"),
    (err: unknown) => err instanceof UnsafeUrlError,
  );
});

test("decimal / hex / octal IP literal obfuscation is normalised and blocked", async () => {
  // WHATWG URL parses all of these to 127.0.0.1.
  for (const target of [
    "http://2130706433/",
    "http://0x7f000001/",
    "http://0177.0.0.1/",
  ]) {
    await assert.rejects(
      () => assertSafeOutboundUrl(target),
      (err: unknown) => err instanceof UnsafeUrlError,
      `${target} should be blocked`,
    );
  }
});

test("expanded IPv6 loopback form is blocked", async () => {
  await assert.rejects(
    () => assertSafeOutboundUrl("http://[0:0:0:0:0:0:0:1]/"),
    (err: unknown) => err instanceof UnsafeUrlError,
  );
});

test("non-http protocols are rejected", async () => {
  for (const url of ["file:///etc/passwd", "ftp://example.com", "gopher://example.com", "javascript:alert(1)"]) {
    await assert.rejects(
      () => assertSafeOutboundUrl(url),
      (err: unknown) => err instanceof UnsafeUrlError,
      `${url} should be rejected`,
    );
  }
});

test("internal hostnames are rejected", async () => {
  for (const url of [
    "http://localhost/admin",
    "http://metadata.google.internal/computeMetadata/v1/",
  ]) {
    await assert.rejects(
      () => assertSafeOutboundUrl(url),
      (err: unknown) => err instanceof UnsafeUrlError,
      `${url} should be rejected`,
    );
  }
});

test("cloud metadata endpoint literal IP is rejected (SSRF)", async () => {
  await assert.rejects(
    () => assertSafeOutboundUrl("http://169.254.169.254/latest/meta-data/"),
    (err: unknown) => err instanceof UnsafeUrlError,
  );
});

test("loopback literal IP is rejected (SSRF)", async () => {
  await assert.rejects(
    () => assertSafeOutboundUrl("http://127.0.0.1:3000/api/cron/reminders"),
    (err: unknown) => err instanceof UnsafeUrlError,
  );
});

test("IPv6 loopback literal is rejected (SSRF)", async () => {
  await assert.rejects(
    () => assertSafeOutboundUrl("http://[::1]:3000/"),
    (err: unknown) => err instanceof UnsafeUrlError,
  );
});

test("empty and non-string inputs are rejected", async () => {
  for (const value of ["", "   ", undefined, null, 123]) {
    await assert.rejects(
      () => assertSafeOutboundUrl(value),
      (err: unknown) => err instanceof UnsafeUrlError,
    );
  }
});

test("public IP literals pass validation", async () => {
  const url = await assertSafeOutboundUrl("https://8.8.8.8/robots.txt");
  assert.equal(url.hostname, "8.8.8.8");
});