export const TRAIL = { spacing: 9, minGapMs: 60, lifeMs: 700, alpha: 0.5, max: 12, radius: 3 } as const;

/** Opacity of a trail blob of the given age: fades linearly to nothing. */
export const trailAlpha = (ageMs: number): number => TRAIL.alpha * Math.max(0, 1 - ageMs / TRAIL.lifeMs);

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
