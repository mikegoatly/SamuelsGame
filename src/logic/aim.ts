import type { Point } from './geometry';

const unit = (dx: number, dy: number): Point => {
  const length = Math.hypot(dx, dy);
  return length < 1e-6 ? { x: 1, y: 0 } : { x: dx / length, y: dy / length };
};

/** Unit direction that makes a bolt of `speed` meet a target moving at `velocity`; direct aim when no intercept exists. */
export function leadAim(shooter: Point, target: Point, velocity: Point, speed: number): Point {
  const dx = target.x - shooter.x;
  const dy = target.y - shooter.y;
  const a = velocity.x ** 2 + velocity.y ** 2 - speed ** 2;
  const b = 2 * (dx * velocity.x + dy * velocity.y);
  const c = dx * dx + dy * dy;
  let t = -1;
  if (Math.abs(a) < 1e-9) t = b !== 0 ? -c / b : -1;
  else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const root = Math.sqrt(disc);
      const times = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((v) => v > 0);
      t = times.length > 0 ? Math.min(...times) : -1;
    }
  }
  if (t <= 0) return unit(dx, dy);
  return unit(dx + velocity.x * t, dy + velocity.y * t);
}

export interface SpiralBolt extends Point {
  speed: number;
}

/** Bolts fanned along an outward spiral: each one turns a bit further and flies a bit faster than the last. */
export function spiralVolley(count: number, turns: number, spin: number, baseSpeed: number): SpiralBolt[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = spin + (i / count) * turns * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle), speed: baseSpeed * (0.7 + (0.6 * i) / Math.max(1, count - 1)) };
  });
}
