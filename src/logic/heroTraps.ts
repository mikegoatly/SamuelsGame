/** Appends `item` and drops the oldest entries beyond `max`; returns what was dropped, oldest first. */
export function pushCapped<T>(list: T[], item: T, max: number): T[] {
  list.push(item);
  return list.splice(0, Math.max(0, list.length - max));
}

/** At most one hit per key per window, so overlapping traps do not stack damage on one enemy. */
export class TickGate {
  private readonly last = new Map<unknown, number>();

  constructor(private readonly windowMs: number) {}

  allow(key: unknown, now: number): boolean {
    const before = this.last.get(key);
    if (before !== undefined && now - before < this.windowMs) return false;
    this.last.set(key, now);
    return true;
  }
}
