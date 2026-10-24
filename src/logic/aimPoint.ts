import type { Point } from './geometry';
import { blinkDestination } from './blinkStrike';

const BODY = 3;

/** The ground point `range` px along `direction` from `from`, stopping short of walls (the caster's own spot when boxed in). */
export const aimPoint = (from: Point, direction: Point, range: number, blocked: (x: number, y: number) => boolean): Point =>
  blinkDestination(from, direction, range, BODY, blocked);
