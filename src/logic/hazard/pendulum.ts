import type { Point } from '../geometry';

export interface PendulumSwing {
  /** Rest direction, radians. */
  base: number;
  amplitude: number;
  periodMs: number;
}

export const pendulumAngle = (now: number, offsetMs: number, swing: PendulumSwing): number =>
  swing.base + swing.amplitude * Math.sin((2 * Math.PI * (now + offsetMs)) / swing.periodMs);

export const bladeTip = (pivot: Point, angle: number, length: number): Point => ({ x: pivot.x + Math.cos(angle) * length, y: pivot.y + Math.sin(angle) * length });

/** Distance from p to the segment a-b. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** True when a victim circle touches the blade (a thick segment from the pivot to the tip). */
export const bladeHits = (pivot: Point, tip: Point, bladeRadius: number, victim: Point, victimRadius: number): boolean =>
  distanceToSegment(victim, pivot, tip) <= bladeRadius + victimRadius;

/** Tile-free bounding box of everything the swing can touch. */
export function swingBounds(pivot: Point, length: number, swing: PendulumSwing, bladeRadius: number): { minX: number; minY: number; maxX: number; maxY: number } {
  const points = [pivot, ...Array.from({ length: 33 }, (_, i) => bladeTip(pivot, swing.base - swing.amplitude + (2 * swing.amplitude * i) / 32, length))];
  return {
    minX: Math.min(...points.map((p) => p.x)) - bladeRadius,
    minY: Math.min(...points.map((p) => p.y)) - bladeRadius,
    maxX: Math.max(...points.map((p) => p.x)) + bladeRadius,
    maxY: Math.max(...points.map((p) => p.y)) + bladeRadius,
  };
}
