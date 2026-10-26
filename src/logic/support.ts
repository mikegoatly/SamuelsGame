import type { Point } from './geometry';

export interface SupportTarget extends Point {
  hp: number;
  maxHp: number;
  warded: boolean;
}

const HEAL_BELOW = 0.7;

export const healAmount = (maxHp: number): number => Math.max(1, Math.round(maxHp * 0.25));

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Index of the most wounded ally within reach (under 70% health), or -1. */
export function pickHealTarget(targets: readonly SupportTarget[], from: Point, radius: number): number {
  let best = -1;
  let worst = HEAL_BELOW;
  targets.forEach((t, i) => {
    const ratio = t.hp / t.maxHp;
    if (dist(t, from) <= radius && ratio < worst) {
      best = i;
      worst = ratio;
    }
  });
  return best;
}

/** Index of the nearest ally in reach that has no ward yet, or -1. */
export function pickWardTarget(targets: readonly SupportTarget[], from: Point, radius: number): number {
  let best = -1;
  let nearest = radius;
  targets.forEach((t, i) => {
    const d = dist(t, from);
    if (!t.warded && d <= nearest) {
      best = i;
      nearest = d;
    }
  });
  return best;
}
