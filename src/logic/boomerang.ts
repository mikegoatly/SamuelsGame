import type { Point } from './geometry';

export interface BladeState extends Point {
  phase: 'out' | 'back';
  done: boolean;
}

export interface BladeStep {
  dir: Point;
  /** What the blade returns to (the player's current position). */
  target: Point;
  distance: number;
  range: number;
  blocked: (x: number, y: number) => boolean;
  catchRadius: number;
}

export const launchBlade = (from: Point): BladeState => ({ x: from.x, y: from.y, phase: 'out', done: false });

/** Flies out along `dir` until the range or a wall, then homes back on the target and is done when caught. `origin` distance is measured from where it was thrown. */
export function stepBlade(blade: BladeState, step: BladeStep, origin: Point = step.target): BladeState {
  if (blade.done) return blade;
  if (blade.phase === 'out') return flyOut(blade, step, origin);
  return flyBack(blade, step);
}

function flyOut(blade: BladeState, { dir, distance, range, blocked }: BladeStep, origin: Point): BladeState {
  const length = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / length;
  const uy = dir.y / length;
  const x = blade.x + ux * distance;
  const y = blade.y + uy * distance;
  if (blocked(x, y)) return { ...blade, phase: 'back' };
  const over = Math.hypot(x - origin.x, y - origin.y) - range;
  return over >= 0 ? { x: x - ux * over, y: y - uy * over, phase: 'back', done: false } : { x, y, phase: 'out', done: false };
}

/** The way back is a straight line to the target: a wall in the path drops the blade where it is. */
function flyBack(blade: BladeState, { target, distance, catchRadius, blocked }: BladeStep): BladeState {
  const gap = Math.hypot(target.x - blade.x, target.y - blade.y);
  if (gap <= catchRadius || gap <= distance) return { ...blade, x: target.x, y: target.y, done: true };
  const x = blade.x + ((target.x - blade.x) / gap) * distance;
  const y = blade.y + ((target.y - blade.y) / gap) * distance;
  return blocked(x, y) ? { ...blade, done: true } : { ...blade, x, y };
}

/** Lets each body be hit once per pass ('out' and 'back'). */
export class HitOnce<K> {
  private readonly seen = { out: new Set<K>(), back: new Set<K>() };

  claim(phase: 'out' | 'back', key: K): boolean {
    if (this.seen[phase].has(key)) return false;
    this.seen[phase].add(key);
    return true;
  }
}
