import { damageToEnemy } from './combat';
import type { Point } from './geometry';

/** Fireball at skill level 1 (the per-level table in content/skills.ts starts from these). `damage` is independent of the held weapon. */
export const FIREBALL = {
  cooldownMs: 2500,
  radius: 40,
  /** Damage multiplier at the very edge of the blast. */
  edgeDamage: 0.4,
  damage: 30,
  speed: 170,
  range: 230,
} as const;

/** 1 at the centre, linear down to `edge` at the radius, 0 beyond. */
export function aoeFalloff(distance: number, radius: number, edge: number = FIREBALL.edgeDamage): number {
  if (distance > radius) return 0;
  return 1 - (1 - edge) * (Math.max(0, distance) / radius);
}

export const fireballDamage = (baseDamage: number, playerLevel: number, monsterLevel: number, modifier = 1): number =>
  damageToEnemy(baseDamage, playerLevel, monsterLevel, modifier);

export interface BlastTarget extends Point {
  /** Half-size of the target's body, so big enemies are hit by the blast's edge. */
  reach: number;
}

export function fireballVictims(
  centre: Point,
  targets: readonly BlastTarget[],
  radius: number = FIREBALL.radius,
  edge: number = FIREBALL.edgeDamage,
): { index: number; multiplier: number }[] {
  const victims: { index: number; multiplier: number }[] = [];
  targets.forEach((target, index) => {
    const distance = Math.max(0, Math.hypot(target.x - centre.x, target.y - centre.y) - target.reach);
    const multiplier = aoeFalloff(distance, radius, edge);
    if (multiplier > 0) victims.push({ index, multiplier });
  });
  return victims;
}

/** `count` unit headings evenly around the circle, the first turned a half step off the travel `heading`. */
export function splitDirections(heading: Point, count: number): Point[] {
  const base = Math.atan2(heading.y, heading.x) + Math.PI / count;
  return Array.from({ length: count }, (_, i) => ({ x: Math.cos(base + (i * Math.PI * 2) / count), y: Math.sin(base + (i * Math.PI * 2) / count) }));
}
