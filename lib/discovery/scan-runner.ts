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

export interface DiscoveryAdapter {
  discover(url: string, signal?: AbortSignal): Promise<unknown>;
}

/**
 * Adapters report per-scan failures through an `errors` array instead of
 * throwing. Surface those as failures so a scan is never reported as
 * "completed" with zero content.
 */
function discoveryFailure(outcome: unknown): string | undefined {
  if (outcome && typeof outcome === "object" && "errors" in outcome) {
    const errors = (outcome as { errors?: unknown }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.map((entry) => String(entry)).join("; ");
    }
  }
  return undefined;
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

  async runScan(sourceUrl: string, adapter: DiscoveryAdapter): Promise<ScanJobRecord> {
    const startedAt = new Date().toISOString();
    let retries = 0;
    let candidatesDiscovered = 0;
    let lastError: string | undefined;

    while (retries <= this.config.maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const outcome = await adapter.discover(sourceUrl, controller.signal);

        const failure = discoveryFailure(outcome);
        if (failure) {
          throw new Error(failure);
        }

        candidatesDiscovered += 1;
        return {
          status: "completed",
          startedAt,
          completedAt: new Date().toISOString(),
          candidatesDiscovered,
        };
      } catch (err) {
        lastError = controller.signal.aborted
          ? `Scan timed out after ${this.config.timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : String(err);
        retries++;
        if (retries <= this.config.maxRetries) {
          await new Promise((r) => setTimeout(r, this.config.rateLimitMs));
        }
      } finally {
        clearTimeout(timeoutId);
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
