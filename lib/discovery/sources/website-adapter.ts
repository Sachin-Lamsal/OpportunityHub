import { getScraper } from "@/lib/ingestion/scraper";

export interface WebsiteDiscoveryResult {
  url: string;
  title?: string;
  description?: string;
  content: string;
  foundAt: string;
  sourceName: string;
  errors?: string[];
}

export class WebsiteSourceAdapter {
  name = "website";

  async discover(url: string): Promise<WebsiteDiscoveryResult> {
    const errors: string[] = [];
    try {
      const scraper = getScraper();
      const result = await scraper.scrape(url);
      return {
        url,
        title: result.title,
        description: result.description,
        content: result.content.slice(0, 15000),
        foundAt: new Date().toISOString(),
        sourceName: this.name,
        errors,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      return {
        url,
        content: "",
        foundAt: new Date().toISOString(),
        sourceName: this.name,
        errors,
      };
    }
  }
}
