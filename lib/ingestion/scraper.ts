/**
 * Pluggable Web Scraper Layer for OpportunityHub Ingestion Pipeline
 * Allows any scraper adapter (Default Fetch, Firecrawl, Playwright, Puppeteer)
 * to be plugged in seamlessly.
 */

import { safeFetch } from "@/lib/security/safe-fetch";
import type { ResolveHostname } from "@/lib/security/safe-fetch";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export interface ScrapedResult {
  url: string;
  title?: string;
  description?: string;
  content: string;
  images: string[];
  metadata?: Record<string, string>;
}

export interface ScraperAdapter {
  name: string;
  scrape(url: string, signal?: AbortSignal): Promise<ScrapedResult>;
}

export interface ScrapeOptions {
  /** Test seam: supply a resolver that simulates DNS rebinding. */
  resolveHostname?: ResolveHostname;
}

/**
 * Built-in default fetch-based scraper.
 * Lightweight, fast, zero heavy dependencies.
 * Strips HTML boilerplate and extracts clean text, meta tags, and notice images.
 */
export class DefaultFetchScraper implements ScraperAdapter {
  name = "default-fetch";

  async scrape(
    url: string,
    signal?: AbortSignal,
    options: ScrapeOptions = {},
  ): Promise<ScrapedResult> {
    const response = await safeFetch(url, {
      signal,
      timeoutMs: 15_000,
      maxBytes: DEFAULT_MAX_BYTES,
      resolveHostname: options.resolveHostname,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OpportunityHub/1.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (response.status >= 400) {
      throw new Error(
        `Failed to fetch URL (HTTP ${response.status}: ${response.headers["content-type"] ?? "error"})`,
      );
    }

    return this.parseHtml(response.url, response.body);
  }

  private parseHtml(url: string, html: string): ScrapedResult {
    // 1. Extract Title
    let title: string | undefined;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch?.[1]) {
      title = titleMatch[1].trim();
    }

    // 2. Extract Meta tags (OG and standard)
    const metadata: Record<string, string> = {};
    const metaRegex = /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*>/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      const key = match[1].toLowerCase();
      metadata[key] = match[2];
    }

    // Check og:title fallback
    if (!title && metadata["og:title"]) {
      title = metadata["og:title"];
    }

    const description = metadata["description"] || metadata["og:description"] || "";

    // 3. Extract Images (OG image + flyer/banner images)
    const images: string[] = [];
    if (metadata["og:image"]) {
      images.push(this.resolveUrl(url, metadata["og:image"]));
    }

    const imgRegex = /<img\s+[^>]*?src=["']([^"']+)["'][^>]*>/gi;
    while ((match = imgRegex.exec(html)) !== null) {
      const imgSrc = match[1];
      if (
        imgSrc &&
        !imgSrc.includes(".svg") &&
        !imgSrc.includes("icon") &&
        !imgSrc.includes("avatar") &&
        !imgSrc.includes("pixel") &&
        !imgSrc.startsWith("data:")
      ) {
        images.push(this.resolveUrl(url, imgSrc));
      }
    }

    // 4. Strip scripts, styles, nav, footer, etc.
    let clean = html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "");

    // Convert common block tags into newlines
    clean = clean
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|br\s*\/?)>/gi, "\n")
      .replace(/<[^>]+>/g, " ");

    // Decode basic HTML entities
    clean = clean
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Condense extra whitespace and blank lines
    const textLines = clean
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const bodyContent = textLines.join("\n");

    return {
      url,
      title: title || metadata["og:title"],
      description,
      content: bodyContent.slice(0, 15000), // Limit to top 15KB text to fit LLM context
      images: Array.from(new Set(images)).slice(0, 5), // top 5 candidate images
      metadata,
    };
  }

  private resolveUrl(base: string, relative: string): string {
    try {
      return new URL(relative, base).href;
    } catch {
      return relative;
    }
  }
}

// Global scraper instance & registry
let currentScraper: ScraperAdapter = new DefaultFetchScraper();

export function setScraperAdapter(adapter: ScraperAdapter) {
  currentScraper = adapter;
}

export function getScraper(): ScraperAdapter {
  return currentScraper;
}
