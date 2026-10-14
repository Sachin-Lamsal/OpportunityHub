/**
 * Facebook Discovery - Permitted Access Boundary
 *
 * This adapter documents what is technically and legally permitted:
 * - Public page content via standard HTTP fetch (same mechanism as any public site)
 * - No Facebook Graph API calls requiring credentials or permissions
 * - No private/group access attempts
 * - No automated posting or interaction
 *
 * Blockers reported honestly:
 * - Facebook Graph API requires verified app review for most endpoints.
 * - No `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, or `FACEBOOK_ACCESS_TOKEN` configured.
 * - This adapter operates within permitted public-access boundaries only.
 */

export interface FacebookDiscoveryResult {
  url: string;
  pageName?: string;
  postText?: string;
  postUrl?: string;
  foundAt: string;
  errors: string[];
  permissionLimitations: string[];
}

export class FacebookBoundaryAdapter {
  name = "facebook";

  async discover(publicPageUrl: string): Promise<FacebookDiscoveryResult[]> {
    const limitations = [
      "No Facebook Graph API credentials configured (FACEBOOK_APP_ID / APP_SECRET / ACCESS_TOKEN).",
      "Only public page content accessible via standard HTTP fetch is attempted.",
      "No private/group access, no automated interactions, no posting permitted.",
      "Public page scraping is subject to robots.txt and Facebook Terms of Service.",
    ];
    try {
      // Only attempt a basic public fetch with permitted headers; never impersonate
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(publicPageUrl, {
        headers: {
          "User-Agent": "OpportunityHub-Discovery/1.0 (academic; permitted public access only)",
          Accept: "text/html",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        return [
          {
            url: publicPageUrl,
            foundAt: new Date().toISOString(),
            errors: [`Public fetch returned ${res.status}`],
            permissionLimitations: limitations,
          },
        ];
      }
      const text = await res.text();
      // Minimal safe extraction: no embedded instructions executed
      const pageNameMatch = text.match(/<meta[^>]+property="og:site_name"[^>]*content="([^"]+)"/i);
      return [
        {
          url: publicPageUrl,
          pageName: pageNameMatch ? pageNameMatch[1] : undefined,
          postText: "Public page content detected (structured extraction requires permitted access).",
          postUrl: publicPageUrl,
          foundAt: new Date().toISOString(),
          errors: ["Facebook discovery operates at permitted boundary; full structured extraction requires authorized access (see docs)."],
          permissionLimitations: limitations,
        },
      ];
    } catch (err) {
      return [
        {
          url: publicPageUrl,
          foundAt: new Date().toISOString(),
          errors: [err instanceof Error ? err.message : String(err)],
          permissionLimitations: limitations,
        },
      ];
    }
  }
}
