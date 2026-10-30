import type { Point } from './geometry';

/** A push of length 0-1 away from neighbours inside `radius`, stronger the closer they are; monsters standing on the same spot split along `fallbackAngle`. */
export function separationPush(self: Point, others: readonly Point[], radius: number, fallbackAngle = 0): Point {
  let x = 0;
  let y = 0;
  for (const o of others) {
    const dx = self.x - o.x;
    const dy = self.y - o.y;
    const d = Math.hypot(dx, dy);
    if (d >= radius) continue;
    const strength = 1 - d / radius;
    if (d < 0.001) {
      x += Math.cos(fallbackAngle) * strength;
      y += Math.sin(fallbackAngle) * strength;
    } else {
      x += (dx / d) * strength;
      y += (dy / d) * strength;
    }
  }
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}
