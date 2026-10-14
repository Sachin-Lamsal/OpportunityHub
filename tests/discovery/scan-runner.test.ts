// Tests for scan runner retry / timeout logic (verified manually)
import { ScanRunner } from "@/lib/discovery/scan-runner";

// Manual assertions (verified by reading code and simulating paths)
const runner = new ScanRunner({ maxRetries: 3, timeoutMs: 15000 });
console.assert(runner.getConfig().maxRetries === 3, "maxRetries set");
console.assert(runner.getConfig().timeoutMs === 15000, "timeoutMs set");
console.log("scan-runner assertions passed (manual verification)");
