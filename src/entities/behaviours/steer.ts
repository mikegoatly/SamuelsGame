import { damageToPlayer } from '../../logic/combat';
import type { Point } from '../../logic/geometry';
import type { ShotStyle } from '../EnemyProjectile';
import type { Enemy } from '../Enemy';

export const distanceTo = (host: Enemy, point: Point): number => Math.hypot(point.x - host.x, point.y - host.y);

/** Unit vector from the monster toward a point (zero-length safe). */
export function directionTo(host: Enemy, point: Point): Point {
  const length = distanceTo(host, point) || 1;
  return { x: (point.x - host.x) / length, y: (point.y - host.y) / length };
}

/** Walks straight at `goal` at `speed` (already including slows), facing the way it moves. */
export function goToward(host: Enemy, goal: Point, speed: number): void {
  const d = directionTo(host, goal);
  host.setVelocity(d.x * speed, d.y * speed);
  if (Math.abs(d.x) > 0.05) host.setFlipX(d.x < 0);
}

export function stand(host: Enemy): void {
  host.setVelocity(0, 0);
}

/** Fires a bolt from the monster at the player's damage scaling. */
export function shootBolt(host: Enemy, dir: Point, speed: number, range: number, style?: ShotStyle, damageScale = 1): void {
  const damage = Math.max(1, Math.round(damageToPlayer(host.def.baseDamage, host.level, host.target.level) * damageScale));
  host.shots.fire(host.x, host.y, dir.x, dir.y, speed, damage, range, style);
}

/** Walks toward `dir` scaled by `weight`; sums several wishes into one velocity. */
export function blendWishes(wishes: readonly { dir: Point; weight: number }[], speed: number): Point {
  const sum = wishes.reduce((acc, w) => ({ x: acc.x + w.dir.x * w.weight, y: acc.y + w.dir.y * w.weight }), { x: 0, y: 0 });
  const length = Math.hypot(sum.x, sum.y);
  return length < 1e-6 ? { x: 0, y: 0 } : { x: (sum.x / length) * speed, y: (sum.y / length) * speed };
}
