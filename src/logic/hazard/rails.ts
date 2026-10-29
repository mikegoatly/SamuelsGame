import type { LayoutRoom } from '../dungeonLayout';
import { rectsOverlap, type Rect } from '../geometry';

/** Shortest rail worth a minecart, in tiles. */
export const RAIL_MIN_TILES = 6;

const key = (x: number, y: number): string => `${x},${y}`;
const within = (rects: readonly Rect[], x: number, y: number): boolean => rects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

/**
 * Straight one-tile rails a minecart could run on in a room: maximal runs of free floor (no cover, interior walls or `ground` patches)
 * along a row or column, keeping off the corridor lanes so rails never sit on the way in. Rails are painted on the floor and never block anything.
 */
export function railRuns(room: LayoutRoom, solid: ReadonlySet<string>, ground: readonly Rect[] = []): Rect[] {
  const { rect } = room;
  const free = (x: number, y: number): boolean => !solid.has(key(x, y)) && !within(ground, x, y);
  const runs: Rect[] = [];
  const scan = (horizontal: boolean): void => {
    const [lines, length, centre] = horizontal ? [rect.h, rect.w, room.cy] : [rect.w, rect.h, room.cx];
    const [lineStart, runStart] = horizontal ? [rect.y, rect.x] : [rect.x, rect.y];
    for (let line = lineStart; line < lineStart + lines; line++) {
      if (Math.abs(line - centre) <= 2) continue;
      let start = -1;
      for (let at = runStart; at <= runStart + length; at++) {
        const ok = at < runStart + length && (horizontal ? free(at, line) : free(line, at));
        if (ok && start < 0) start = at;
        if (!ok && start >= 0) {
          if (at - start >= RAIL_MIN_TILES) runs.push(horizontal ? { x: start, y: line, w: at - start, h: 1 } : { x: line, y: start, w: 1, h: at - start });
          start = -1;
        }
      }
    }
  };
  scan(true);
  scan(false);
  return runs;
}

/** Runs that keep a clear tile away from every `used` rect (other rails and hazards), so rails never touch or cross. */
export function freeRuns(runs: readonly Rect[], used: readonly Rect[]): Rect[] {
  const grown = used.map((u): Rect => ({ x: u.x - 1, y: u.y - 1, w: u.w + 2, h: u.h + 2 }));
  return runs.filter((run) => !grown.some((u) => rectsOverlap(u, run)));
}
