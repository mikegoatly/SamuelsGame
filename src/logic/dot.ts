interface Entry {
  until: number;
  nextAt: number;
  tickMs: number;
}

/** Damage-over-time bookkeeping: one entry per key, so reapplying refreshes the duration instead of stacking. */
export class DotTracker<K> {
  private readonly entries = new Map<K, Entry>();

  apply(key: K, now: number, durationMs: number, tickMs: number): void {
    const entry = this.entries.get(key);
    if (entry) entry.until = now + durationMs;
    else this.entries.set(key, { until: now + durationMs, nextAt: now + tickMs, tickMs });
  }

  active(key: K): boolean {
    return this.entries.has(key);
  }

  hasEntries(): boolean {
    return this.entries.size > 0;
  }

  clear(): void {
    this.entries.clear();
  }

  remove(key: K): void {
    this.entries.delete(key);
  }

  /** Keys whose tick is due at `now` (at most one tick each, even after a long gap); expired entries are dropped. */
  due(now: number): K[] {
    const ticking: K[] = [];
    for (const [key, entry] of this.entries) {
      if (now >= entry.nextAt) {
        ticking.push(key);
        const next = entry.nextAt + entry.tickMs;
        entry.nextAt = next > now ? next : now + entry.tickMs;
      }
      if (now >= entry.until) this.entries.delete(key);
    }
    return ticking;
  }
}
