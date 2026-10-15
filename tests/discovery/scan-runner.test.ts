import { test } from "node:test";
import assert from "node:assert/strict";
import { ScanRunner } from "@/lib/discovery/scan-runner";

test("config defaults are applied and readable", () => {
  const runner = new ScanRunner({ maxRetries: 3, timeoutMs: 15000 });
  assert.equal(runner.getConfig().maxRetries, 3);
  assert.equal(runner.getConfig().timeoutMs, 15000);
});

test("successful scan reports completed and one candidate", async () => {
  const runner = new ScanRunner({ maxRetries: 1, rateLimitMs: 1 });
  let called = 0;

  const result = await runner.runScan("https://example.com", {
    async discover() {
      called += 1;
      return { content: "hello", errors: [] };
    },
  });

  assert.equal(result.status, "completed");
  assert.equal(result.candidatesDiscovered, 1);
  assert.equal(called, 1);
  assert.ok(result.completedAt);
  assert.equal(result.errorMessage, undefined);
});

test("adapter-reported errors are treated as failure, not silent success", async () => {
  const runner = new ScanRunner({ maxRetries: 1, rateLimitMs: 1 });

  const result = await runner.runScan("https://example.com", {
    async discover() {
      return { content: "", errors: ["Failed to fetch URL (HTTP 500)"] };
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.candidatesDiscovered, 0);
  assert.match(result.errorMessage ?? "", /HTTP 500/);
});

test("throwing adapter is retried up to maxRetries then fails", async () => {
  const runner = new ScanRunner({ maxRetries: 2, rateLimitMs: 1 });
  let calls = 0;

  const result = await runner.runScan("https://example.com", {
    async discover() {
      calls += 1;
      throw new Error("boom");
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(calls, 3); // initial attempt + 2 retries
  assert.equal(result.errorMessage, "boom");
  assert.equal(result.candidatesDiscovered, 0);
});

test("abort signal is passed to the adapter and a timeout is reported", async () => {
  const runner = new ScanRunner({ maxRetries: 0, timeoutMs: 20, rateLimitMs: 1 });
  let receivedSignal: AbortSignal | undefined;

  const result = await runner.runScan("https://example.com", {
    discover(_url, signal) {
      receivedSignal = signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () =>
          reject(new Error("The operation was aborted")),
        );
      });
    },
  });

  assert.ok(receivedSignal, "adapter should receive an AbortSignal");
  assert.equal(result.status, "failed");
  assert.match(result.errorMessage ?? "", /timed out after 20ms/);
});

test("no rate-limit delay is applied after a successful scan", async () => {
  const runner = new ScanRunner({ maxRetries: 3, rateLimitMs: 5000 });

  const started = Date.now();
  const result = await runner.runScan("https://example.com", {
    async discover() {
      return { content: "ok", errors: [] };
    },
  });
  const elapsed = Date.now() - started;

  assert.equal(result.status, "completed");
  assert.ok(elapsed < 1000, `expected fast completion, took ${elapsed}ms`);
});