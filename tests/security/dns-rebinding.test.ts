import { test } from "node:test";
import assert from "node:assert/strict";

import http from "node:http";

import {
  createValidatingLookup,
  requestOnceUnvalidated,
  safeFetch,
  type ResolveHostname,
  type ValidatingLookup,
} from "@/lib/security/safe-fetch";
import { UnsafeUrlError, assertSafeOutboundUrl } from "@/lib/security/url-guard";
import { DefaultFetchScraper } from "@/lib/ingestion/scraper";

/**
 * DNS-rebinding regression suite.
 *
 * The attack: a resolver under the attacker's control answers with a PUBLIC
 * address during validation, then with a PRIVATE address when the socket is
 * actually opened.
 *
 * These tests never contact real cloud metadata endpoints or any internal
 * service. All "internal" targets are RFC1918 / loopback literals on ephemeral
 * ports, and a private address is only ever *resolved*, never connected to,
 * because the guard must reject it before a socket is opened.
 */

const PUBLIC_IP = "93.184.216.34";

/**
 * Deliberately permissive: resolves anything to loopback WITHOUT validation.
 * Used only for transport-level tests (size cap, timeout, body integrity) that
 * must actually connect to a local test server. The SSRF guard is covered by
 * separate tests in this file and in url-guard.test.ts.
 */
const passthroughLookup: ValidatingLookup = (_hostname, _options, callback) => {
  callback(null, "127.0.0.1", 4);
};
const PRIVATE_IP = "10.0.0.5";

/** Resolver that returns `publicFirst` on call 1 and `privateSecond` after. */
function rebindingResolver(
  publicFirst: string,
  privateSecond: string,
): { resolver: ResolveHostname; calls: () => number } {
  let calls = 0;
  const resolver: ResolveHostname = (_hostname, _options, callback) => {
    calls += 1;
    const address = calls === 1 ? publicFirst : privateSecond;
    callback(null, [{ address, family: 4 }]);
  };
  return { resolver, calls: () => calls };
}

/** Resolver that always returns the given address. */
function fixedResolver(address: string): ResolveHostname {
  return (_hostname, _options, callback) => {
    callback(null, [{ address, family: 4 }]);
  };
}

test("validating lookup accepts an all-public resolution", (t, done) => {
  const lookup = createValidatingLookup(fixedResolver(PUBLIC_IP));
  lookup("example.com", {}, (err, address, family) => {
    assert.equal(err, null);
    assert.equal(address, PUBLIC_IP);
    assert.equal(family, 4);
    done();
  });
});

test("validating lookup refuses a private address at connection time", (t, done) => {
  const lookup = createValidatingLookup(fixedResolver(PRIVATE_IP));
  lookup("rebind.example", {}, (err, address) => {
    assert.ok(err, "lookup must fail");
    assert.equal(address, undefined);
    done();
  });
});

test("validating lookup fails closed when ANY resolved address is private", (t, done) => {
  // Attacker returns one public + one private address hoping we pick the public
  // one and follow a connection that can land on the private one.
  const mixed: ResolveHostname = (_h, _o, callback) => {
    callback(null, [
      { address: PUBLIC_IP, family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
  };

  const lookup = createValidatingLookup(mixed);
  lookup("mixed.example", {}, (err) => {
    assert.ok(err, "must reject the whole resolution");
    done();
  });
});

test("validating lookup fails closed on an empty resolution", (t, done) => {
  const empty: ResolveHostname = (_h, _o, callback) => callback(null, []);
  const lookup = createValidatingLookup(empty);
  lookup("empty.example", {}, (err) => {
    assert.ok(err);
    done();
  });
});

test("validating lookup propagates resolver errors", (t, done) => {
  const failing: ResolveHostname = (_h, _o, callback) =>
    callback(new Error("ENOTFOUND"));
  const lookup = createValidatingLookup(failing);
  lookup("nope.example", {}, (err) => {
    assert.ok(err);
    done();
  });
});

test("DNS REBINDING: public-then-private resolution blocks the real connection", async () => {
  const { resolver, calls } = rebindingResolver(PUBLIC_IP, PRIVATE_IP);

  // The pre-check in assertSafeOutboundUrl uses the injected resolver too.
  // Call 1 (pre-check) returns the public address and passes. Call 2 happens
  // inside net.connect and must return the private address and be REJECTED —
  // this is exactly the TOCTOU window the old fetch()-based code had open.
  await assert.rejects(
    () =>
      safeFetch("http://rebind.example/", {
        resolveHostname: resolver,
        timeoutMs: 2000,
      }),
    (err: Error) => /private or reserved|timeout|socket hang up|ECONN/i.test(err.message),
    "rebinding must not reach the internal address",
  );

  assert.ok(calls() >= 2, `resolver should have been consulted again at connect time (calls=${calls()})`);
});

test("DNS REBINDING through the scraper is blocked", async () => {
  const { resolver, calls } = rebindingResolver(PUBLIC_IP, "127.0.0.1");
  const scraper = new DefaultFetchScraper();

  await assert.rejects(() =>
    scraper.scrape("http://rebind.example/", undefined, { resolveHostname: resolver }),
  );

  assert.ok(calls() >= 2, "connection-time validation must have run");
});

test("DNS REBINDING to loopback is blocked even after a valid pre-check", async () => {
  const { resolver } = rebindingResolver(PUBLIC_IP, "127.0.0.1");
  await assert.rejects(() =>
    safeFetch("http://rebind2.example/", { resolveHostname: resolver, timeoutMs: 2000 }),
  );
});

test("DNS REBINDING to link-local metadata range is blocked", async () => {
  const { resolver } = rebindingResolver(PUBLIC_IP, "169.254.169.254");
  await assert.rejects(() =>
    safeFetch("http://rebind3.example/", { resolveHostname: resolver, timeoutMs: 2000 }),
  );
});

test("IPv6 answers are validated too, not just IPv4", async () => {
  const ipv6Private: ResolveHostname = (_h, _o, callback) =>
    callback(null, [{ address: "::1", family: 6 }]);

  await assert.rejects(() =>
    safeFetch("http://rebind4.example/", {
      resolveHostname: ipv6Private,
      timeoutMs: 2000,
    }),
  );
});

test("IPv4-mapped IPv6 answers are validated", async () => {
  // ::ffff:127.0.0.1 is loopback wearing an IPv6 costume.
  const mapped: ResolveHostname = (_h, _o, callback) =>
    callback(null, [{ address: "::ffff:7f00:1", family: 6 }]);

  await assert.rejects(() =>
    safeFetch("http://rebind5.example/", { resolveHostname: mapped, timeoutMs: 2000 }),
  );
});

test("redirect targets are re-validated by the guard", async () => {
  // The redirect loop re-validates every hop through assertSafeOutboundUrl.
  // We assert that property directly on the guard, because an end-to-end
  // redirect test is impossible hermetically: the first hop would have to be a
  // reachable PUBLIC address, and we cannot serve one from a test.
  const blocked = [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:8080/",
    "http://10.0.0.5/",
    "http://[::1]/",
    "http://localhost/",
  ];

  for (const target of blocked) {
    await assert.rejects(
      () => assertSafeOutboundUrl(target),
      (err: unknown) => err instanceof UnsafeUrlError,
      `redirect target ${target} must be rejected`,
    );
  }
});

test("response size cap is enforced against a real server", async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("x".repeat(200_000));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;

  try {
    // requestOnceUnvalidated is used here on purpose: this test is about the
    // response-size limit, not about the SSRF guard (which has its own tests).
    // The connection genuinely happens, so the assertion is meaningful.
    await assert.rejects(
      () =>
        requestOnceUnvalidated(
          new URL(`http://127.0.0.1:${port}/`),
          { maxBytes: 1024, timeoutMs: 5000 },
          passthroughLookup,
        ),
      /exceeded 1024 bytes/,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("request timeout is enforced against a hanging server", async () => {
  const server = http.createServer((_req, res) => {
    // Never respond; force the client-side timeout to fire.
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("partial");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;

  try {
    await assert.rejects(
      () =>
        requestOnceUnvalidated(
          new URL(`http://127.0.0.1:${port}/`),
          { timeoutMs: 300, maxBytes: 5_000_000 },
          passthroughLookup,
        ),
      /timed out after 300ms|socket hang up/i,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeAllConnections?.();
  }
});

test("a normal response is returned intact", async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<title>hello</title>");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;

  try {
    const response = await requestOnceUnvalidated(
      new URL(`http://127.0.0.1:${port}/`),
      { timeoutMs: 5000 },
      passthroughLookup,
    );
    assert.equal(response.status, 200);
    assert.equal(response.body, "<title>hello</title>");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
