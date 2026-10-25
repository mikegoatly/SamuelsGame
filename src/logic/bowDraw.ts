export const BOW = {
  tapDamage: 0.6,
  fullDamage: 2.2,
  tapSpeed: 0.7,
  fullSpeed: 1.6,
  fullPierce: 3,
  /** Draw fraction from which a shot counts as fully drawn. */
  fullAt: 0.95,
} as const;

export interface BowShot {
  damageScale: number;
  speedScale: number;
  pierce: number;
  full: boolean;
}

export interface DrawUpdate {
  fraction: number;
  /** The draw fraction the arrow was let go at, on the frame the fire input is released. */
  released: number | null;
}

/** Tracks how long the fire input has been held and reports the draw when it is let go. */
export class BowDraw {
  private startedAt: number | null = null;
  /** After a cancel the button must be let go once before it draws again. */
  private waitForRelease = false;
  /** A release that came while the bow was cooling down, waiting to fire. */
  private pending: number | null = null;

  update(held: boolean, now: number, maxMs: number, ready = true): DrawUpdate {
    let released: number | null = null;
    if (this.waitForRelease) {
      if (held) return { fraction: 0, released: null };
      this.waitForRelease = false;
    }
    if (!held && this.startedAt !== null) {
      this.pending = Math.min(1, (now - this.startedAt) / maxMs);
      this.startedAt = null;
    }
    if (this.pending !== null && ready) {
      released = this.pending;
      this.pending = null;
    }
    if (!held) return { fraction: 0, released };
    this.startedAt ??= now;
    return { fraction: Math.min(1, (now - this.startedAt) / maxMs), released };
  }

  /** Drops the draw and any waiting shot (pause, card, death, weapon swap); the held button is ignored until released. */
  cancel(): void {
    this.startedAt = null;
    this.pending = null;
    this.waitForRelease = true;
  }
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/** A tap is a weak slow arrow; a full draw hits 2.2x as hard, flies faster and pierces. */
export function bowShot(fraction: number): BowShot {
  const full = fraction >= BOW.fullAt;
  return {
    damageScale: lerp(BOW.tapDamage, BOW.fullDamage, fraction),
    speedScale: lerp(BOW.tapSpeed, BOW.fullSpeed, fraction),
    pierce: full ? BOW.fullPierce : 0,
    full,
  };
}
