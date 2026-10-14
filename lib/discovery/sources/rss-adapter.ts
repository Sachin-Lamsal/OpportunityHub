import { safeFetch } from "@/lib/security/safe-fetch";
export interface RssDiscoveryResult {
  url: string;
  feedTitle?: string;
  itemTitle?: string;
  itemUrl?: string;
  description?: string;
  foundAt: string;
  errors: string[];
}

export class RssSourceAdapter {
  name = "rss";

  async discover(feedUrl: string): Promise<RssDiscoveryResult[]> {
    const results: RssDiscoveryResult[] = [];
    try {
      const res = await safeFetch(feedUrl, {
        timeoutMs: 15000,
        headers: {
          "User-Agent": "OpportunityHub-Discovery/1.0",
          Accept: "application/rss+xml, application/xml;q=0.9",
        },
      });
      if (res.status >= 400) {
        return [
          {
            url: feedUrl,
            foundAt: new Date().toISOString(),
            errors: [`RSS fetch failed: ${res.status}`],
          },
        ];
      }
      const text = res.body;
      const items: RssDiscoveryResult[] = this.parseFeed(text);
      results.push(...items);
    } catch (err) {
      results.push({
        url: feedUrl,
        foundAt: new Date().toISOString(),
        errors: [err instanceof Error ? err.message : String(err)],
      });
    }
    return results;
  }

  private parseFeed(text: string): RssDiscoveryResult[] {
    // Minimal safe parser: extract item URLs and titles via regex
    const urlMatches = text.match(/<link>(https?:\/\/[^<]+)<\/link>/g) || [];
    const titleMatches = text.match(/<title>([^<]+)<\/title>/g) || [];
    const results: RssDiscoveryResult[] = [];
    for (let i = 0; i < Math.min(urlMatches.length, 10); i++) {
      const url = urlMatches[i].replace(/<link>/, "").replace(/<\/link>/, "");
      const titleRaw = titleMatches[i] ? titleMatches[i].replace(/<title>/, "").replace(/<\/title>/, "") : "";
      results.push({
        url,
        itemTitle: titleRaw.trim(),
        itemUrl: url,
        foundAt: new Date().toISOString(),
        errors: [],
      });
    }
    return results;
  }
}
