import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Thrown when an outbound URL targets an unsafe destination (SSRF protection).
 */
export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 protocol assignments
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Expands an IPv6 literal into its eight 16-bit groups, or null if unparsable. */
function expandIpv6(ip: string): number[] | null {
  // Drop any zone index (fe80::1%eth0).
  const [address] = ip.split("%");
  let value = address;

  // Rewrite a trailing dotted-quad (e.g. ::ffff:127.0.0.1) into hex groups.
  const lastColon = value.lastIndexOf(":");
  const tail = value.slice(lastColon + 1);
  if (tail.includes(".")) {
    const octets = tail.split(".");
    if (octets.length !== 4) return null;
    const nums = octets.map((octet) => Number.parseInt(octet, 10));
    if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
    const high = ((nums[0] << 8) | nums[1]).toString(16);
    const low = ((nums[2] << 8) | nums[3]).toString(16);
    value = `${value.slice(0, lastColon + 1)}${high}:${low}`;
  }

  let groups: string[];
  const compressed = value.indexOf("::");
  if (compressed !== -1) {
    const [left, right] = value.split("::");
    const leftGroups = left ? left.split(":") : [];
    const rightGroups = right ? right.split(":") : [];
    const fill = 8 - leftGroups.length - rightGroups.length;
    if (fill < 0) return null;
    groups = [...leftGroups, ...Array<string>(fill).fill("0"), ...rightGroups];
  } else {
    groups = value.split(":");
  }

  if (groups.length !== 8) return null;

  const expanded: number[] = [];
  for (const group of groups) {
    const parsed = Number.parseInt(group || "0", 16);
    if (Number.isNaN(parsed)) return null;
    expanded.push(parsed & 0xffff);
  }
  return expanded;
}

function isPrivateIpv6(ip: string): boolean {
  const groups = expandIpv6(ip);
  // Fail closed: an address we cannot parse is not one we should fetch.
  if (!groups) return true;

  const allZero = groups.every((group) => group === 0);
  if (allZero) return true; // ::

  // fe80::/10 link-local
  if ((groups[0] & 0xffc0) === 0xfe80) return true;
  // fc00::/7 unique-local
  if ((groups[0] & 0xfe00) === 0xfc00) return true;
  // ff00::/8 multicast
  if ((groups[0] & 0xff00) === 0xff00) return true;

  const zeroPrefix = groups.slice(0, 5).every((group) => group === 0);

  if (zeroPrefix && groups[5] === 0xffff) {
    // IPv4-mapped ::ffff:a.b.c.d
    return isPrivateIpv4(embeddedIpv4(groups));
  }

  if (zeroPrefix && groups[5] === 0 && groups[6] === 0) {
    // IPv4-compatible ::a.b.c.d (deprecated, still routable in some stacks)
    const embedded = embeddedIpv4(groups);
    if (embedded === "0.0.0.1") return true; // ::1
    return isPrivateIpv4(embedded);
  }

  if (zeroPrefix && groups[5] === 0 && groups[6] === 0 && groups[7] === 1) {
    return true; // ::1 loopback
  }

  return false;
}

function embeddedIpv4(groups: number[]): string {
  const high = groups[6];
  const low = groups[7];
  return `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
}

/** Returns true when the given IP literal belongs to a private, loopback, link-local, or reserved range. */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export type HostnameResolver = (
  hostname: string,
  callback: (err: Error | null, addresses: { address: string }[]) => void,
) => void;

const defaultResolver: HostnameResolver = (hostname, callback) => {
  lookup(hostname, { all: true, verbatim: true })
    .then((addresses) =>
      callback(null, (addresses ?? []) as { address: string }[]),
    )
    .catch((err: Error) => callback(err, []));
};

/**
 * Validates that an outbound URL is safe to fetch server-side.
 * Blocks non-HTTP(S) protocols, internal hostnames, literal private IPs,
 * and hostnames that resolve to private addresses (basic SSRF protection).
 *
 * NOTE: This DNS check is a fast pre-filter only. It is NOT the security
 * boundary — the authoritative check happens at socket-connection time via
 * `safeFetch`'s validating `lookup`, which is immune to DNS rebinding. See
 * `lib/security/safe-fetch.ts`.
 */
export async function assertSafeOutboundUrl(
  input: unknown,
  resolveHostname: HostnameResolver = defaultResolver,
): Promise<URL> {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new UnsafeUrlError("A non-empty URL string is required.");
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new UnsafeUrlError("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are allowed.");
  }

  // Normalise: lowercase, drop IPv6 brackets and any trailing root dot
  // ("localhost." would otherwise bypass the hostname denylist).
  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
  if (!hostname) {
    throw new UnsafeUrlError("URL hostname is required.");
  }

  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new UnsafeUrlError("Requests to internal hosts are not allowed.");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError("Requests to private addresses are not allowed.");
    }
    return url;
  }

  let addresses: { address: string }[] = [];
  try {
    addresses = await new Promise<{ address: string }[]>((resolve, reject) => {
      resolveHostname(hostname, (err, resolved) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(resolved ?? []);
      });
    });
  } catch {
    throw new UnsafeUrlError("Unable to resolve hostname.");
  }

  if (!addresses || addresses.length === 0) {
    throw new UnsafeUrlError("Unable to resolve hostname.");
  }

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new UnsafeUrlError("Requests to private addresses are not allowed.");
    }
  }

  return url;
}
