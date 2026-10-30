import type { Point } from './geometry';

/** Does the line a body swept from `a` to `b` pass within `r` of `c`? */
export function segmentHitsCircle(a: Point, b: Point, c: Point, r: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.min(1, Math.max(0, ((c.x - a.x) * dx + (c.y - a.y) * dy) / length));
  return Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y) <= r;
}

/** Only real room monsters pay: never bosses, boss pieces, or anything summoned, spawned, split or raised mid-fight. */
export const canSnatchFrom = (monster: { boss: boolean; roomMonster: boolean }): boolean => monster.roomMonster && !monster.boss;

/** Nab's Snatch: each monster gives up one coin, once. */
export class SnatchLog {
  private readonly taken = new WeakSet<object>();

  take(monster: object): boolean {
    if (this.taken.has(monster)) return false;
    this.taken.add(monster);
    return true;
  }
}
