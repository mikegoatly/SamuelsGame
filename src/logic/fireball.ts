import { damageToEnemy } from './combat';
import type { Point } from './geometry';

export const FIREBALL = {
  cooldownMs: 2500,
  radius: 40,
  /** Damage multiplier at the very edge of the blast. */
  edgeDamage: 0.4,
  damageMultiplier: 3,
  speed: 170,
  range: 230,
} as const;

/** 1 at the centre, linear down to `edgeDamage` at the radius, 0 beyond. */
export function aoeFalloff(distance: number, radius: number): number {
  if (distance > radius) return 0;
  return 1 - (1 - FIREBALL.edgeDamage) * (Math.max(0, distance) / radius);
}

export const fireballDamage = (weaponBase: number, playerLevel: number, monsterLevel: number, modifier = 1): number =>
  damageToEnemy(weaponBase * FIREBALL.damageMultiplier, playerLevel, monsterLevel, modifier);

export interface FireballStatus {
  available: boolean;
  ready: boolean;
  /** Cooldown progress, 0 just cast .. 1 ready. */
  fraction: number;
}

export function fireballStatus(input: { unlocked: boolean; castsPowers: boolean; now: number; readyAt: number }): FireballStatus {
  const { unlocked, castsPowers, now, readyAt } = input;
  const available = unlocked && castsPowers;
  const remaining = Math.max(0, readyAt - now);
  const fraction = Math.min(1, Math.max(0, 1 - remaining / FIREBALL.cooldownMs));
  return { available, ready: available && remaining === 0, fraction: available ? fraction : 0 };
}

export interface BlastTarget extends Point {
  /** Half-size of the target's body, so big enemies are hit by the blast's edge. */
  reach: number;
}

export function fireballVictims(centre: Point, targets: readonly BlastTarget[], radius: number = FIREBALL.radius): { index: number; multiplier: number }[] {
  const victims: { index: number; multiplier: number }[] = [];
  targets.forEach((target, index) => {
    const edge = Math.max(0, Math.hypot(target.x - centre.x, target.y - centre.y) - target.reach);
    const multiplier = aoeFalloff(edge, radius);
    if (multiplier > 0) victims.push({ index, multiplier });
  });
  return victims;
}
