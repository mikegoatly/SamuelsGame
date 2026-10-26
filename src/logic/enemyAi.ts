export type RangedStance = 'retreat' | 'hold' | 'approach';

export function rangedStance(distance: number, near: number, far: number): RangedStance {
  if (distance < near) return 'retreat';
  return distance > far ? 'approach' : 'hold';
}

export interface Direction {
  x: number;
  y: number;
}

/** `count` unit vectors evenly round the full circle, the first at `offset` radians. */
export function ringDirections(count: number, offset = 0): Direction[] {
  return Array.from({ length: count }, (_, i) => ({ x: Math.cos(offset + (i * Math.PI * 2) / count), y: Math.sin(offset + (i * Math.PI * 2) / count) }));
}

/** `count` unit vectors fanned evenly across `arc` radians, centred on (dx, dy), or on `fallback` when that has no length. */
export function spreadDirections(dx: number, dy: number, count: number, arc: number, fallback: Direction = { x: 1, y: 0 }): Direction[] {
  const aimless = Math.hypot(dx, dy) < 1e-6;
  const centre = aimless ? Math.atan2(fallback.y, fallback.x) : Math.atan2(dy, dx);
  return Array.from({ length: count }, (_, i) => {
    const angle = count === 1 ? centre : centre - arc / 2 + (arc * i) / (count - 1);
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}
