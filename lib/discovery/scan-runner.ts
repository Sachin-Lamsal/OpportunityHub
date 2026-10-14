export interface ScanConfig {
  maxRetries: number;
  timeoutMs: number;
  rateLimitMs: number;
}

export interface ScanJobRecord {
  sourceId?: string;
  status: "running" | "completed" | "failed" | "aborted";
  startedAt: string;
  completedAt?: string;
  candidatesDiscovered: number;
  errorMessage?: string;
}

export class ScanRunner {
  private config: ScanConfig;

  constructor(config: Partial<ScanConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      timeoutMs: config.timeoutMs ?? 15000,
      rateLimitMs: config.rateLimitMs ?? 2000,
    };
  }

  getConfig(): ScanConfig {
    return { ...this.config };
  }

  async runScan(sourceUrl: string, adapter: { discover(url: string): Promise<unknown> }): Promise<ScanJobRecord> {
    const startedAt = new Date().toISOString();
    let retries = 0;
    let candidatesDiscovered = 0;
    let lastError: string | undefined;

    while (retries <= this.config.maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
        // Run adapter scan with timeout
        await adapter.discover(sourceUrl);
        clearTimeout(timeoutId);
        candidatesDiscovered++;
        // Rate limit between attempts
        if (retries < this.config.maxRetries) await new Promise((r) => setTimeout(r, this.config.rateLimitMs));
        return {
          status: "completed",
          startedAt,
          completedAt: new Date().toISOString(),
          candidatesDiscovered,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        retries++;
        if (retries <= this.config.maxRetries) {
          await new Promise((r) => setTimeout(r, this.config.rateLimitMs));
        }
      }
    }
    return {
      status: "failed",
      startedAt,
      completedAt: new Date().toISOString(),
      candidatesDiscovered,
      errorMessage: lastError,
    };
  }
}
