import type { Point } from './geometry';
import { isFrontal } from './shield';

/** A bolt hits the mirror when it arrives inside the front arc of `facing`. */
export const reflectsBolt = (facing: number, knight: Point, bolt: Point, arc: number): boolean =>
  isFrontal(facing, { x: bolt.x - knight.x, y: bolt.y - knight.y }, arc);

/** Unit vector pointing back where the bolt came from. */
export function reflectDirection(velocity: Point): Point {
  const length = Math.hypot(velocity.x, velocity.y);
  return length < 1e-6 ? { x: 1, y: 0 } : { x: -velocity.x / length, y: -velocity.y / length };
}
