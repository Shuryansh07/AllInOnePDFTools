/**
 * Small in-memory protections for CPU-heavy endpoints.
 * State is per server instance; behind multiple instances, move this to a shared store (e.g. Redis).
 */

/** Parse a positive integer from config (e.g. an env var), falling back when missing or invalid. */
export function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true if the request is allowed. */
  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);

    // Opportunistic cleanup so the map can't grow without bound.
    if (this.hits.size > 5000) {
      for (const [k, times] of this.hits) {
        if (times.every((time) => now - time >= this.windowMs)) this.hits.delete(k);
      }
    }
    return true;
  }
}

/** Caps how many jobs run at once so a burst can't exhaust CPU or memory. */
export class ConcurrencyGate {
  private active = 0;

  constructor(private readonly max: number) {}

  tryAcquire(): boolean {
    if (this.active >= this.max) return false;
    this.active++;
    return true;
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
  }
}
