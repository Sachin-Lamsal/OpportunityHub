import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import type { LookupFunction } from "node:net";

import { UnsafeUrlError, assertSafeOutboundUrl, isPrivateAddress } from "@/lib/security/url-guard";

/**
 * DNS-rebinding-safe outbound HTTP.
 *
 * WHY THIS EXISTS
 * ---------------
 * Validating a hostname with `dns.lookup()` and then calling `fetch()` leaves a
 * time-of-check / time-of-use gap: `fetch` performs its OWN DNS resolution, so
 * an attacker-controlled resolver can answer "8.8.8.8" during validation and
 * "127.0.0.1" moments later when the socket is actually opened. That is the
 * classic DNS-rebinding SSRF bypass.
 *
 * THE FIX
 * -------
 * We do not use `fetch`. We open the socket ourselves with `node:http` /
 * `node:https` and pass a custom `lookup` function. Node invokes `lookup`
 * INSIDE `net.connect` / `tls.connect`, i.e. at the exact moment the connection
 * address is chosen. The address that gets validated is therefore the address
 * that gets connected to — there is no second resolution step to rebind.
 *
 * Because the URL still carries the real hostname:
 *   - TLS SNI is sent as the hostname (Node derives `servername` from the host),
 *     so certificate validation still works against the real name.
 *   - The HTTP `Host` header is the real hostname, so virtual hosts work.
 * We never rewrite the URL to an IP literal, so no SNI/Host breakage occurs.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Injectable DNS resolver — swapped out in tests to simulate rebinding. */
export type ResolveHostname = (
  hostname: string,
  options: dns.LookupAllOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    addresses?: dns.LookupAddress[],
  ) => void,
) => void;

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address?: string | dns.LookupAddress[],
  family?: number,
) => void;

export type ValidatingLookup = (
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCallback,
) => void;

/**
 * Node's `LookupFunction` declares `address` as required even on the error
 * path, where it is unused. We keep our internal callback permissive and adapt
 * at the single call site.
 */
function asLookupFunction(lookup: ValidatingLookup): LookupFunction {
  return lookup as unknown as LookupFunction;
}

const defaultResolve: ResolveHostname = (
  hostname,
  options,
  callback,
) => {
  dns.lookup(hostname, options, (err, addresses) => {
    callback(err, addresses as dns.LookupAddress[] | undefined);
  });
};

/**
 * Builds a `lookup` function that validates every address at connection time.
 *
 * Fails CLOSED: if ANY address the resolver returns for this hostname is
 * private/reserved, the whole connection is refused. A legitimate public host
 * does not resolve to a private address, so this costs nothing in practice and
 * removes the "attacker returns one public + one private address" trick.
 */
export function createValidatingLookup(
  resolveHostname: ResolveHostname = defaultResolve,
): ValidatingLookup {
  return function validatingLookup(hostname, options, callback) {
    resolveHostname(
      hostname,
      { all: true, verbatim: true },
      (err, addresses) => {
        if (err) {
          callback(err);
          return;
        }

        if (!addresses || addresses.length === 0) {
          callback(
            new UnsafeUrlError(
              "Unable to resolve hostname to any address.",
            ) as NodeJS.ErrnoException,
          );
          return;
        }

        for (const { address } of addresses) {
          if (isPrivateAddress(address)) {
            callback(
              new UnsafeUrlError(
                "Connection resolved to a private or reserved address.",
              ) as NodeJS.ErrnoException,
            );
            return;
          }
        }

        if (options && options.all) {
          callback(null, addresses);
          return;
        }

        const chosen = addresses[0];
        callback(null, chosen.address, chosen.family);
      },
    );
  };
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Test seam: supply a resolver that simulates DNS rebinding. */
  resolveHostname?: ResolveHostname;
}

export interface SafeFetchResult {
  /** Final URL after redirects. */
  url: string;
  status: number;
  headers: Record<string, string>;
  /** UTF-8 decoded body. Use bodyBuffer for binary payloads (images, files). */
  body: string;
  /** Raw bytes, never re-encoded. */
  bodyBuffer: Buffer;
  /** Number of redirects followed. */
  redirects: number;
}

function once(
  resolve: (value: SafeFetchResult) => void,
  reject: (reason?: unknown) => void,
) {
  let settled = false;
  return {
    ok: (value: SafeFetchResult) => {
      if (settled) return;
      settled = true;
      resolve(value);
    },
    fail: (reason?: unknown) => {
      if (settled) return;
      settled = true;
      reject(reason);
    },
  };
}

/**
 * @internal Exported for tests only. Performs a single request WITHOUT any SSRF
 * validation — callers must validate the URL first (safeFetch does). Do not call
 * with untrusted input.
 */
export async function requestOnceUnvalidated(
  url: URL,
  options: SafeFetchOptions,
  validatingLookup: ValidatingLookup,
): Promise<SafeFetchResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    headers = {},
    signal,
  } = options;

  return new Promise<SafeFetchResult>((resolve, reject) => {
    const settle = once(resolve, reject);

    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const request = transport.request(
      url,
      {
        method: "GET",
        // Keep the real hostname so SNI + Host header stay correct.
        servername: isHttps ? url.hostname : undefined,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...headers,
        },
        // The security-critical option: validated at connection time.
        lookup: asLookupFunction(validatingLookup),
        signal,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(response.headers)) {
          if (typeof value === "string") responseHeaders[key] = value;
        }

        const isRedirect = REDIRECT_STATUSES.has(status);

        if (isRedirect || status >= 400) {
          // Drain and discard; no need to buffer error/redirect bodies.
          response.resume();
          settle.ok({
            url: url.href,
            status,
            headers: responseHeaders,
            body: "",
            bodyBuffer: Buffer.alloc(0),
            redirects: 0,
          });
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        response.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            response.destroy();
            settle.fail(new Error(`Response exceeded ${maxBytes} bytes.`));
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          settle.ok({
            url: url.href,
            status,
            headers: responseHeaders,
            body: buffer.toString("utf8"),
            bodyBuffer: buffer,
            redirects: 0,
          });
        });

        response.on("error", (err) => settle.fail(err));
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(
        new Error(`Request to ${url.hostname} timed out after ${timeoutMs}ms.`),
      );
    });

    request.on("error", (err) => settle.fail(err));
    request.end();
  });
}

/**
 * Performs an outbound GET that cannot be redirected to a private address,
 * including via DNS rebinding.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const validatingLookup = createValidatingLookup(options.resolveHostname);

  // The pre-filter must use the SAME resolver as the connection-time check,
  // otherwise the two could disagree.
  const preFilter = options.resolveHostname
    ? (hostname: string, callback: (err: Error | null, addresses: { address: string }[]) => void) =>
        options.resolveHostname!(hostname, { all: true, verbatim: true }, (err, addresses) =>
          callback(err, (addresses ?? []) as { address: string }[]),
        )
    : undefined;

  let current = preFilter ? await assertSafeOutboundUrl(rawUrl, preFilter) : await assertSafeOutboundUrl(rawUrl);
  let redirects = 0;

  for (;;) {
    const response = await requestOnceUnvalidated(current, options, validatingLookup);

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { ...response, redirects };
    }

    const location = response.headers.location;
    if (!location) {
      throw new Error("Redirect response is missing a Location header.");
    }

    if (redirects >= maxRedirects) {
      throw new Error("Too many redirects.");
    }

    // Re-validate the next hop. assertSafeOutboundUrl is a cheap pre-check;
    // the connection-time `lookup` is what actually guarantees safety.
    current = preFilter
      ? await assertSafeOutboundUrl(new URL(location, current).href, preFilter)
      : await assertSafeOutboundUrl(new URL(location, current).href);
    redirects += 1;
  }
}