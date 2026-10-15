export const DEFAULT_REDIRECT_PATH = "/dashboard";

/**
 * Restricts a post-login redirect target to a same-origin relative path.
 *
 * Without this, `?next=@evil.com` makes `origin + next` parse as
 * `https://<app-host>@evil.com`, which browsers resolve to the attacker's
 * host — an open redirect usable for phishing. Only single-slash paths that do
 * not start with "//", "/\" or contain a scheme/authority are accepted.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_REDIRECT_PATH;

  const candidate = value.trim();

  if (!candidate.startsWith("/")) return DEFAULT_REDIRECT_PATH;
  // "//host" and "/\host" are treated as protocol-relative by browsers.
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return DEFAULT_REDIRECT_PATH;
  // Percent-encoded separators (%2f, %5c) can also collapse to a double slash.
  if (/%2f|%5c/i.test(candidate)) return DEFAULT_REDIRECT_PATH;
  // Anything with an explicit scheme or authority is out of bounds.
  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) return DEFAULT_REDIRECT_PATH;
  if (candidate.includes("//")) return DEFAULT_REDIRECT_PATH;

  return candidate;
}