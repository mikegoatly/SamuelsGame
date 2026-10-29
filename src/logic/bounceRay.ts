import type { Point, Rect } from './geometry';

/** The walls a bouncing thing stays inside. */
export type Arena = { kind: 'circle'; centre: Point; radius: number } | { kind: 'rect'; rect: Rect };

const EPSILON = 1e-9;

export function reflect(dir: Point, normal: Point): Point {
  const along = dir.x * normal.x + dir.y * normal.y;
  return { x: dir.x - 2 * along * normal.x, y: dir.y - 2 * along * normal.y };
}

const unit = (v: Point): Point => {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
};

/** Where a ray from inside the arena meets the wall, and the wall's normal there (pointing inward). */
export function rayExit(arena: Arena, from: Point, dir: Point): { point: Point; normal: Point } {
  const d = unit(dir);
  if (arena.kind === 'circle') {
    const { centre, radius } = arena;
    const ox = from.x - centre.x;
    const oy = from.y - centre.y;
    const b = ox * d.x + oy * d.y;
    const c = ox * ox + oy * oy - radius * radius;
    const t = Math.max(0, -b + Math.sqrt(Math.max(0, b * b - c)));
    const point = { x: from.x + d.x * t, y: from.y + d.y * t };
    return { point, normal: { x: (centre.x - point.x) / radius, y: (centre.y - point.y) / radius } };
  }
  const { x, y, w, h } = arena.rect;
  const tx = d.x > EPSILON ? (x + w - from.x) / d.x : d.x < -EPSILON ? (x - from.x) / d.x : Infinity;
  const ty = d.y > EPSILON ? (y + h - from.y) / d.y : d.y < -EPSILON ? (y - from.y) / d.y : Infinity;
  const t = Math.max(0, Math.min(tx, ty));
  const point = { x: from.x + d.x * t, y: from.y + d.y * t };
  const hitX = Math.abs(tx - t) < 1e-6;
  const hitY = Math.abs(ty - t) < 1e-6;
  return { point, normal: { x: hitX ? -Math.sign(d.x) : 0, y: hitY ? -Math.sign(d.y) : 0 } };
}

/** The polyline of a shot that reflects off the arena walls `bounces` times: the start, then every wall it touches. */
export function bouncePath(arena: Arena, from: Point, dir: Point, bounces: number): Point[] {
  const path: Point[] = [from];
  let at = from;
  let heading = unit(dir);
  for (let i = 0; i <= bounces; i++) {
    const hit = rayExit(arena, at, heading);
    path.push(hit.point);
    heading = unit(reflect(heading, hit.normal));
    at = hit.point;
  }
  return path;
}

export function segmentDistance(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq < EPSILON ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/** Distance from a point to the nearest part of a polyline. */
export function pathDistance(path: readonly Point[], p: Point): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) best = Math.min(best, segmentDistance(p, path[i - 1]!, path[i]!));
  return best;
}
