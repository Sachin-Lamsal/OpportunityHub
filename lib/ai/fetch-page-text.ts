/** Best-effort fetch of public page text for AI context (not full scraping). */
export async function fetchPageText(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpportunityHub/1.0 (student portfolio app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
    const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
    const text = withoutStyles.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    return text.slice(0, 8000) || null;
  } catch {
    return null;
  }
}
