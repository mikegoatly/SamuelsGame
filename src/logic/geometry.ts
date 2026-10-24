export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const rectArea = (r: Rect): number => r.w * r.h;

export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const rectContains = (r: Rect, p: Point): boolean => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

export const insetRect = (r: Rect, by: number): Rect => ({ x: r.x + by, y: r.y + by, w: r.w - 2 * by, h: r.h - 2 * by });

export const rectCenter = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
