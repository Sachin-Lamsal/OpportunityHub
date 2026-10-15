import { safeFetch } from "@/lib/security/safe-fetch";

/** Best-effort fetch of public page text for AI context (not full scraping). */
export async function fetchPageText(url: string): Promise<string | null> {
  try {
    // safeFetch enforces: http(s) only, no private/reserved IPs (literal or via
    // DNS, validated at connection time), bounded redirects, timeout and a
    // response-size cap. Previously this call only checked the protocol, so any
    // publisher-controlled registration_link could reach internal services.
    const response = await safeFetch(url, {
      headers: {
        "User-Agent": "OpportunityHub/1.0 (student portfolio app)",
        Accept: "text/html,application/xhtml+xml",
      },
      timeoutMs: 10_000,
      maxBytes: 2 * 1024 * 1024,
    });

    if (response.status >= 400) {
      return null;
    }

    const withoutScripts = response.body.replace(/<script[\s\S]*?<\/script>/gi, " ");
    const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
    const text = withoutStyles.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    return text.slice(0, 8000) || null;
  } catch {
    return null;
  }
}