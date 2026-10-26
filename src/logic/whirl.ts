import type { Point } from './geometry';

const EYE_RADIUS = 6;

/** Distance moved this tick when a whirlwind at `centre` drags `target`: toward the centre, strongest near the rim's inside, none in the calm eye or outside. */
export function pullToward(centre: Point, target: Point, radius: number, strength: number, dtMs: number): Point {
  const dx = centre.x - target.x;
  const dy = centre.y - target.y;
  const distance = Math.hypot(dx, dy);
  if (distance > radius || distance < EYE_RADIUS) return { x: 0, y: 0 };
  const step = strength * (1 - distance / radius * 0.5) * (dtMs / 1000);
  return { x: (dx / distance) * step, y: (dy / distance) * step };
}

/** Swings a bolt's heading away from the whirlwind's core (more the closer it passes) without changing its speed. */
export function bendVelocity(velocity: Point, bolt: Point, centre: Point, radius: number, maxTurnRate: number, dtMs: number): Point {
  const distance = Math.hypot(bolt.x - centre.x, bolt.y - centre.y);
  if (distance > radius) return velocity;
  const side = Math.sign(velocity.x * (bolt.y - centre.y) - velocity.y * (bolt.x - centre.x)) || 1;
  const turn = side * maxTurnRate * (1 - distance / radius) * (dtMs / 1000);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return { x: velocity.x * cos - velocity.y * sin, y: velocity.x * sin + velocity.y * cos };
}
