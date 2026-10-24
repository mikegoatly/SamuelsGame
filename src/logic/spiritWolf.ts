import type { BlastTarget } from './fireball';
import type { Point } from './geometry';

/** Index of the target whose body edge is closest to `from`, or null when there is nothing to hunt. */
export function nearestTarget(from: Point, targets: readonly BlastTarget[], accept: (index: number) => boolean = () => true): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  targets.forEach((target, index) => {
    if (!accept(index)) return;
    const distance = Math.hypot(target.x - from.x, target.y - from.y) - target.reach;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export const biteReady = (now: number, nextBiteAt: number, distanceToEdge: number, reach: number): boolean => now >= nextBiteAt && distanceToEdge <= reach;

const PACK_RADIUS = 14;

/** Spawn offsets from the caster, evenly spread so a pack does not stack on one spot. */
export const packSpawnOffsets = (count: number): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (i * Math.PI * 2) / count;
    return { x: Math.cos(angle) * PACK_RADIUS, y: Math.sin(angle) * PACK_RADIUS };
  });

/** Detects a body that has not moved `minMove` px in a whole `windowMs` (wedged against a wall while chasing). */
export class StuckWatch {
  private anchor: Point | null = null;
  private anchorAt = 0;

  constructor(
    private readonly windowMs: number,
    private readonly minMove: number,
  ) {}

  stuck(now: number, at: Point): boolean {
    if (!this.anchor) {
      this.anchor = { ...at };
      this.anchorAt = now;
      return false;
    }
    if (now - this.anchorAt < this.windowMs) return false;
    const moved = Math.hypot(at.x - this.anchor.x, at.y - this.anchor.y);
    this.anchor = { ...at };
    this.anchorAt = now;
    return moved < this.minMove;
  }

  reset(): void {
    this.anchor = null;
  }
}
