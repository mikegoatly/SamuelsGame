interface Cooldown {
  readyAt: number;
  durationMs: number;
}

/** Per-skill cooldowns measured on a caller-supplied clock (the pause-safe GameClock in the game). */
export class SkillCooldowns {
  private readonly cooldowns = new Map<string, Cooldown>();

  start(id: string, now: number, durationMs: number): void {
    this.cooldowns.set(id, { readyAt: now + durationMs, durationMs });
  }

  remaining(id: string, now: number): number {
    return Math.max(0, (this.cooldowns.get(id)?.readyAt ?? 0) - now);
  }

  ready(id: string, now: number): boolean {
    return this.remaining(id, now) === 0;
  }

  /** Progress 0 (just cast) .. 1 (ready). */
  fraction(id: string, now: number): number {
    const cooldown = this.cooldowns.get(id);
    if (!cooldown || cooldown.durationMs <= 0) return 1;
    return Math.min(1, Math.max(0, 1 - this.remaining(id, now) / cooldown.durationMs));
  }

  reset(): void {
    this.cooldowns.clear();
  }
}
