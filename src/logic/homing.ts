import { steerToward } from './angle';
import type { Point } from './geometry';

export interface HomingTuning {
  /** Radians per second the bolt can bend its heading. */
  turnRate: number;
  /** Lifetime of the steering; afterwards the bolt flies straight. */
  ms: number;
}

/** New heading for a homing bolt: turns toward `desired` by at most turnRate * dt while it is younger than `tuning.ms`. */
export function homingHeading(current: number, desired: number, tuning: HomingTuning, deltaMs: number, ageMs: number): number {
  if (ageMs >= tuning.ms) return current;
  return steerToward(current, desired, (tuning.turnRate * deltaMs) / 1000);
}

/** `target` null means the target is gone: the bolt keeps its heading. */
export function homingStep(current: number, from: Point, target: Point | null, tuning: HomingTuning, deltaMs: number, ageMs: number): number {
  if (!target) return current;
  return homingHeading(current, Math.atan2(target.y - from.y, target.x - from.x), tuning, deltaMs, ageMs);
}
