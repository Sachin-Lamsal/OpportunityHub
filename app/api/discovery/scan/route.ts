import { NextRequest, NextResponse } from "next/server";
import { ScanRunner } from "@/lib/discovery/scan-runner";
import { WebsiteSourceAdapter } from "@/lib/discovery/sources/website-adapter";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { UnsafeUrlError, assertSafeOutboundUrl } from "@/lib/security/url-guard";

export async function POST(req: NextRequest) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const target = await assertSafeOutboundUrl(body?.url);

    const runner = new ScanRunner({ maxRetries: 3, timeoutMs: 15000 });
    const adapter = new WebsiteSourceAdapter();
    const result = await runner.runScan(target.href, adapter);

    return NextResponse.json({ success: result.status === "completed", result });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Scan failed" }, { status: 500 });
  }
}
