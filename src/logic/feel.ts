const MAX_INTENSITY = 0.015;
const MAX_HIT_STOP_MS = 50;

export interface ShakeRequest {
  ms: number;
  intensity: number;
}

/** Decides which camera shakes actually play: a weaker one never interrupts a stronger one, strong ones are capped, reduced mode mutes all. */
export class ShakeBudget {
  reduced = false;
  private endsAt = 0;
  private intensity = 0;

  /** Forget any running shake (new scene). */
  reset(): void {
    this.endsAt = 0;
    this.intensity = 0;
  }

  request(now: number, ms: number, intensity: number): ShakeRequest | null {
    if (this.reduced) return null;
    const capped = Math.min(MAX_INTENSITY, intensity);
    if (now < this.endsAt && this.intensity >= capped) return null;
    this.endsAt = now + ms;
    this.intensity = capped;
    return { ms, intensity: capped };
  }
}

/** Rate-limits the freeze frames so rapid bolt hits do not stutter the game. */
export class HitStopGate {
  private lastAt = -Infinity;

  constructor(private readonly minGapMs: number) {}

  reset(): void {
    this.lastAt = -Infinity;
  }

  /** Milliseconds to freeze for (0 = skip). */
  take(now: number, ms: number): number {
    if (now - this.lastAt < this.minGapMs) return 0;
    this.lastAt = now;
    return Math.min(MAX_HIT_STOP_MS, ms);
  }
}
