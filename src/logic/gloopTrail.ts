export const TRAIL = { spacing: 9, minGapMs: 60, lifeMs: 700, alpha: 0.5, max: 12, radius: 3, reducedMax: 5, reducedLifeMs: 350 } as const;

/** Reduce-flashes mode keeps the trail calmer: fewer, shorter-lived blobs. */
export const trailLimits = (reduced: boolean): { max: number; lifeMs: number } =>
  reduced ? { max: TRAIL.reducedMax, lifeMs: TRAIL.reducedLifeMs } : { max: TRAIL.max, lifeMs: TRAIL.lifeMs };

/** Opacity of a trail blob of the given age: fades linearly to nothing. */
export const trailAlpha = (ageMs: number, lifeMs: number = TRAIL.lifeMs): number => TRAIL.alpha * Math.max(0, 1 - ageMs / lifeMs);

/** Decides where Gloop drops trail blobs: after moving `spacing` px from the last one, and never faster than `minGapMs`. */
export class GloopTrail {
  private last: { x: number; y: number; at: number } | undefined;

  step(x: number, y: number, now: number): { x: number; y: number } | null {
    if (!this.last) {
      this.last = { x, y, at: now };
      return null;
    }
    if (now - this.last.at < TRAIL.minGapMs || Math.hypot(x - this.last.x, y - this.last.y) < TRAIL.spacing) return null;
    this.last = { x, y, at: now };
    return { x, y };
  }

  reset(): void {
    this.last = undefined;
  }
}
