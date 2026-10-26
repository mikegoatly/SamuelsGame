import type { Point } from './geometry';

export interface Flame extends Point {
  until: number;
}

export interface TrailOptions {
  ttlMs: number;
  /** Minimum distance between two flames. */
  spacing: number;
  max: number;
}

/** A short burning trail left behind a moving monster: flames drop at intervals, burn for a while, and hurt whoever stands on one. */
export class FireTrail {
  private flames: Flame[] = [];

  constructor(private readonly o: TrailOptions) {}

  drop(x: number, y: number, now: number): boolean {
    const last = this.flames[this.flames.length - 1];
    if (last && now < last.until && Math.hypot(x - last.x, y - last.y) < this.o.spacing) return false;
    this.flames.push({ x, y, until: now + this.o.ttlMs });
    if (this.flames.length > this.o.max) this.flames.shift();
    return true;
  }

  live(now: number): Flame[] {
    this.flames = this.flames.filter((flame) => now < flame.until);
    return this.flames;
  }

  touching(p: Point, radius: number, now: number): boolean {
    return this.live(now).some((flame) => Math.hypot(flame.x - p.x, flame.y - p.y) <= radius);
  }
}
