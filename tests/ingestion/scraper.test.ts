import { test } from "node:test";
import assert from "node:assert/strict";
import { DefaultFetchScraper } from "@/lib/ingestion/scraper";
import { UnsafeUrlError } from "@/lib/security/url-guard";

const scraper = new DefaultFetchScraper();

const INTERNAL_TARGETS = [
  "http://localhost:3000/api/cron/reminders",
  "http://127.0.0.1:5432/",
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
  "http://[::1]:9000/",
  "http://10.0.0.5/internal",
  "http://192.168.1.1/admin",
  "http://metadata.google.internal/computeMetadata/v1/",
];

test("scraper refuses to fetch internal/private targets (SSRF guard)", async () => {
  for (const target of INTERNAL_TARGETS) {
    await assert.rejects(
      () => scraper.scrape(target),
      (err: unknown) => err instanceof UnsafeUrlError,
      `expected ${target} to be blocked before any network call`,
    );
  }
});

test("scraper refuses non-http protocols before any network call", async () => {
  for (const target of ["file:///etc/passwd", "ftp://example.com/file"]) {
    await assert.rejects(
      () => scraper.scrape(target),
      (err: unknown) => err instanceof UnsafeUrlError,
      `expected ${target} to be blocked`,
    );
  }
});

test("scraper forwards an abort signal to fetch and rejects when aborted", async () => {
  const controller = new AbortController();

  // example.com is public and passes SSRF validation; we abort immediately so
  // the request cannot complete. This asserts the signal is actually wired to
  // the underlying fetch call rather than silently ignored.
  const pending = scraper.scrape("https://example.com", controller.signal);
  controller.abort();

  await assert.rejects(() => pending);
});