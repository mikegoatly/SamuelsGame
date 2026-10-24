import type { BlastTarget } from './fireball';
import type { Point } from './geometry';

export interface ChainTuning {
  /** Full opening angle of the aim cone, degrees. */
  coneDeg: number;
  coneRange: number;
  /** Extra enemies hit after the first. */
  jumps: number;
  jumpRange: number;
  /** Damage multiplier applied per jump. */
  falloff: number;
}

export type SightCheck = (from: Point, to: Point) => boolean;

const edgeDistance = (from: Point, target: BlastTarget): number => Math.hypot(target.x - from.x, target.y - from.y) - target.reach;

/** Target indices in hit order: nearest in the aim cone, then repeatedly the nearest unused one within jump range; each hop needs a clear line. */
export function chainTargets(origin: Point, aim: Point, tuning: ChainTuning, targets: readonly BlastTarget[], sees: SightCheck): number[] {
  const aimLength = Math.hypot(aim.x, aim.y) || 1;
  const cosHalf = Math.cos((tuning.coneDeg / 2) * (Math.PI / 180));
  const inCone = (target: BlastTarget): boolean => {
    const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
    if (distance - target.reach > tuning.coneRange) return false;
    if (distance < 1e-6) return true;
    return ((target.x - origin.x) * aim.x + (target.y - origin.y) * aim.y) / (distance * aimLength) >= cosHalf;
  };
  const first = nearest(origin, targets, [], (t) => inCone(t) && sees(origin, t));
  if (first < 0) return [];
  const chain = [first];
  while (chain.length <= tuning.jumps) {
    const from = targets[chain[chain.length - 1]!]!;
    const next = nearest(from, targets, chain, (t) => edgeDistance(from, t) <= tuning.jumpRange && sees(from, t));
    if (next < 0) break;
    chain.push(next);
  }
  return chain;
}

function nearest(from: Point, targets: readonly BlastTarget[], used: readonly number[], accept: (target: BlastTarget) => boolean): number {
  let best = -1;
  let bestDistance = Infinity;
  targets.forEach((target, index) => {
    if (used.includes(index) || !accept(target)) return;
    const distance = edgeDistance(from, target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export const chainDamage = (base: number, falloff: number, jumpIndex: number): number => base * falloff ** jumpIndex;
