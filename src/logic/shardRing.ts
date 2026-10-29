import type { Point } from './geometry';

/** `count` unit directions evenly spaced round a circle, the first one `offset` radians from east. */
export const shardRing = (count: number, offset = 0): Point[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) => ({ x: Math.cos(offset + (i * 2 * Math.PI) / count), y: Math.sin(offset + (i * 2 * Math.PI) / count) }));
