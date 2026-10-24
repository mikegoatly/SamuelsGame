export type RangedStance = 'retreat' | 'hold' | 'approach';

export function rangedStance(distance: number, near: number, far: number): RangedStance {
  if (distance < near) return 'retreat';
  return distance > far ? 'approach' : 'hold';
}
