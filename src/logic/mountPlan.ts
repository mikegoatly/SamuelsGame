import type { Point } from './geometry';
import type { WallMount } from './wallMount';

const clearance = (p: Point, taken: readonly Point[]): number => taken.reduce((least, t) => Math.min(least, Math.hypot(t.x - p.x, t.y - p.y)), Infinity);

/** The first candidate at least `gap` from every taken spot; when all are crowded, the one farthest from them. */
export function chooseMount(candidates: readonly WallMount[], taken: readonly Point[], gap: number): WallMount | undefined {
  const clear = candidates.find((c) => clearance(c, taken) >= gap);
  if (clear) return clear;
  return candidates.reduce<WallMount | undefined>((best, c) => (best === undefined || clearance(c, taken) > clearance(best, taken) ? c : best), undefined);
}

interface Claim {
  spot: Point;
  alive?: () => boolean;
}

/** Wall spots handed to pipe spitters: claimed when the marker is placed, held while the spitter lives, forgotten when it dies. */
export class MountBook {
  private readonly claims = new Map<object, Claim>();

  claim(key: object, spot: Point): void {
    this.claims.set(key, { spot });
  }

  /** The marker landed: the spot now belongs to whoever `alive` reports on. */
  hold(key: object, alive: () => boolean): void {
    const claim = this.claims.get(key);
    if (claim) claim.alive = alive;
  }

  release(key: object): void {
    this.claims.delete(key);
  }

  taken(): Point[] {
    for (const [key, claim] of this.claims) if (claim.alive && !claim.alive()) this.claims.delete(key);
    return [...this.claims.values()].map((c) => c.spot);
  }
}
