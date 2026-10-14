import { NextRequest, NextResponse } from "next/server";
import { ScanRunner } from "@/lib/discovery/scan-runner";
import { WebsiteSourceAdapter } from "@/lib/discovery/sources/website-adapter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = body.url || "";
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ success: false, error: "Invalid or missing URL" }, { status: 400 });
    }
    const runner = new ScanRunner({ maxRetries: 3, timeoutMs: 15000 });
    const adapter = new WebsiteSourceAdapter();
    const result = await runner.runScan(url, adapter);
    return NextResponse.json({ success: result.status === "completed", result });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
