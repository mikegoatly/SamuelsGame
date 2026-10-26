/** Per-victim rate limiter so a hazard hurts once per window, however many frames you stand in it. */
export class Cooldowns<K> {
  private readonly next = new Map<K, number>();

  take(key: K, now: number, windowMs: number): boolean {
    if (now < (this.next.get(key) ?? -Infinity)) return false;
    this.next.set(key, now + windowMs);
    return true;
  }

  clear(): void {
    this.next.clear();
  }
}

export const hazardDamage = (maxHp: number, fraction: number): number => Math.max(1, Math.round(maxHp * fraction));
